export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, CheckCircle2, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";
import { formatDayCount, formatExerciseCount, formatWorkoutCount } from "@/lib/utils/copy";
import { formatPlanDateRange, getPlanBorderClass, getPlanDotClass } from "@/lib/workoutPlanHistory";

type PlanRow = {
  id: string;
  name: string;
  month?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean | null;
  status?: string | null;
  color?: string | null;
  created_at?: string | null;
  archived_at?: string | null;
  workout_days?: Array<{ id: string; exercises?: Array<{ id: string }> | null }> | null;
};

type SessionCountRow = {
  id: string;
  status?: string | null;
  workout_plan_id?: string | null;
  deleted_at?: string | null;
};

async function getPlans(profileId: string) {
  try {
    const supabase = createServerSupabaseClient();
    const [{ data: plans }, { data: sessions }] = await Promise.all([
      supabase
        .from("workout_plans")
        .select("id, name, month, start_date, end_date, is_active, status, color, created_at, archived_at, workout_days(id, exercises(id))")
        .eq("profile_id", profileId)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("workout_sessions")
        .select("id, status, workout_plan_id, deleted_at")
        .eq("profile_id", profileId),
    ]);

    const counts = buildSessionCounts((sessions ?? []) as SessionCountRow[]);
    return ((plans ?? []) as PlanRow[]).map((plan) => ({
      ...plan,
      sessionStats: counts.get(plan.id) ?? { total: 0, completed: 0, active: 0, deleted: 0 },
    }));
  } catch {
    return [];
  }
}

export default async function WorkoutArchivePage() {
  const profileId = await getSelectedProfileId();
  if (!profileId) redirect("/profiles");

  const plans = await getPlans(profileId);
  const activePlans = plans.filter((plan: any) => Boolean(plan.is_active) || plan.status === "active");
  const archivedPlans = plans.filter((plan: any) => !(Boolean(plan.is_active) || plan.status === "active"));

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-200">
            <Archive size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gym-info">Archivio</p>
            <h1 className="mt-1 text-3xl font-extrabold">Schede nel tempo</h1>
            <p className="mt-1 text-sm text-gym-muted">Vedi la scheda attiva, quelle archiviate e quante sessioni appartengono a ogni scheda.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link href="/workout" className="rounded-2xl bg-white/10 px-3 py-3 text-center font-bold text-slate-200">Scheda attiva</Link>
        <Link href="/import" className="rounded-2xl bg-gym-accent px-3 py-3 text-center font-extrabold text-slate-950">Importa nuova</Link>
      </div>

      {plans.length === 0 ? (
        <Card>
          <h2 className="text-2xl font-extrabold">Nessuna scheda</h2>
          <p className="mt-2 text-gym-muted">Importa una scheda per creare la prima versione del tuo programma.</p>
          <Link href="/import"><Button className="mt-4 w-full">Importa scheda</Button></Link>
        </Card>
      ) : (
        <div className="space-y-5">
          <PlanSection title="Scheda attiva" description="La scheda che vedi in Home e nella pagina Scheda." plans={activePlans as any[]} />
          <PlanSection title="Schede archiviate" description="Le schede vecchie restano legate allo storico e al calendario." plans={archivedPlans as any[]} empty="Nessuna scheda archiviata." />
        </div>
      )}
    </div>
  );
}

function PlanSection({ title, description, plans, empty }: { title: string; description: string; plans: any[]; empty?: string }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-extrabold">{title}</h2>
        <p className="mt-1 text-sm text-gym-muted">{description}</p>
      </div>
      {plans.length === 0 ? <p className="rounded-3xl bg-white/5 p-4 text-sm text-gym-muted">{empty ?? "Nessuna scheda."}</p> : null}
      {plans.map((plan: any) => <PlanCard key={plan.id} plan={plan} />)}
    </section>
  );
}

function PlanCard({ plan }: { plan: any }) {
  const days = plan.workout_days ?? [];
  const exerciseCount = days.reduce((total: number, day: any) => total + (day.exercises?.length ?? 0), 0);
  const active = Boolean(plan.is_active) || plan.status === "active";
  const stats = plan.sessionStats ?? { total: 0, completed: 0, active: 0, deleted: 0 };
  return (
    <Card className={`${getPlanBorderClass(plan.color)} ${active ? "bg-gym-accent/5" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${getPlanDotClass(plan.color)}`} />
            <p className="text-xs font-bold uppercase text-gym-muted">{active ? "Attiva" : "Archiviata"}</p>
            {active ? <CheckCircle2 size={14} className="text-gym-accent" /> : null}
          </div>
          <h2 className="line-clamp-2 text-xl font-extrabold">{plan.name}</h2>
          <p className="mt-1 text-sm text-gym-muted">{formatPlanDateRange(plan.start_date, plan.end_date)}</p>
          <p className="mt-2 text-sm text-slate-300">{formatDayCount(days.length)} · {formatExerciseCount(exerciseCount)} · {formatWorkoutCount(stats.completed)}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-slate-300">
          <FileText size={18} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <ArchiveStat label="Completati" value={stats.completed} />
        <ArchiveStat label="Aperti" value={stats.active} />
        <ArchiveStat label="Cestino" value={stats.deleted} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {active ? (
          <Link href="/workout" className="rounded-2xl bg-white/10 px-3 py-3 text-center font-extrabold text-slate-100">Apri scheda</Link>
        ) : (
          <Link href={`/history?plan=${plan.id}`} className="rounded-2xl bg-white/10 px-3 py-3 text-center font-extrabold text-slate-100">Vedi storico</Link>
        )}
        <Link href={`/history/calendar?plan=${plan.id}`} className="rounded-2xl bg-white/10 px-3 py-3 text-center font-bold text-slate-200">Calendario</Link>
      </div>
    </Card>
  );
}

function ArchiveStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <p className="text-gym-muted">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-100">{value}</p>
    </div>
  );
}

function buildSessionCounts(sessions: SessionCountRow[]) {
  const counts = new Map<string, { total: number; completed: number; active: number; deleted: number }>();
  for (const session of sessions) {
    if (!session.workout_plan_id) continue;
    const current = counts.get(session.workout_plan_id) ?? { total: 0, completed: 0, active: 0, deleted: 0 };
    current.total += 1;
    if (session.deleted_at) current.deleted += 1;
    else if (session.status === "completed") current.completed += 1;
    else current.active += 1;
    counts.set(session.workout_plan_id, current);
  }
  return counts;
}
