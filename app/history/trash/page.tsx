export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { getDayNameSnapshot, getPlanColorSnapshot, getPlanDotClass, getPlanNameSnapshot } from "@/lib/workoutPlanHistory";
import { formatCompactNumber, getSessionSummary } from "@/lib/progress";
import { TrashSessionActions } from "@/components/history/TrashSessionActions";

async function getDeletedSessions(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("workout_sessions")
      .select("*, workout_plans(name, month, color), workout_days(name), session_exercises(completed, exercise_sets(completed, reps, weight, rpe))")
      .eq("profile_id", profileId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(80);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function TrashPage() {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const sessions = await getDeletedSessions(profileId);

  return (
    <div className="space-y-5">
      <Link href="/history" className="inline-flex items-center gap-2 text-sm font-bold text-gym-accent">
        <ArrowLeft size={16} /> Storico
      </Link>

      <header>
        <p className="text-sm font-semibold text-red-100">Cestino</p>
        <h1 className="mt-2 text-3xl font-extrabold">Sessioni eliminate</h1>
        <p className="mt-2 text-gym-muted">Qui trovi gli allenamenti eliminati. Puoi ripristinarli o eliminarli definitivamente.</p>
      </header>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Trash2 size={20} />}
          title="Cestino vuoto"
          description="Le sessioni eliminate appariranno qui."
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session: any) => {
            const summary = getSessionSummary(session);
            const deletedAt = session.deleted_at
              ? new Date(session.deleted_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
              : "-";
            return (
              <Card key={session.id} className="border-red-400/25 bg-red-500/[0.06]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-red-100">Eliminata {deletedAt}</p>
                    <h2 className="mt-1 line-clamp-2 text-xl font-extrabold">{getDayNameSnapshot(session)}</h2>
                    <p className="mt-1 flex items-center gap-2 text-sm text-gym-muted">
                      <span className={`h-2 w-2 rounded-full ${getPlanDotClass(getPlanColorSnapshot(session))}`} />
                      <span>{getPlanNameSnapshot(session)}</span>
                    </p>
                    <p className="mt-2 text-sm text-slate-300">{summary.completedSets}/{summary.totalSets} serie · {formatCompactNumber(summary.volume)} kg</p>
                  </div>
                  <span className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-bold text-red-100">Cestino</span>
                </div>
                <div className="mt-4">
                  <TrashSessionActions sessionId={session.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
