"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDayNameSnapshot, getPlanColorSnapshot, getPlanDotClass, getPlanNameSnapshot } from "@/lib/workoutPlanHistory";
import { formatCompactNumber, getSessionSummary } from "@/lib/progress";
import { TrashSessionActions } from "@/components/history/TrashSessionActions";
import { EmptyTrashAction } from "@/components/history/EmptyTrashAction";
import { getDeletedSessions } from "@/lib/api-client/history";

export default function TrashPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const profileId = localStorage.getItem("active_profile_id");
      if (!profileId) {
        router.push("/profiles");
        return;
      }

      const data = await getDeletedSessions(profileId);
      setSessions(data as any[]);
      setLoading(false);
    }

    loadData();
  }, [router]);

  if (loading) {
    return <div className="p-6 text-center text-gym-muted">Caricamento cestino...</div>;
  }

  return (
    <div className="space-y-5">
      <Link href="/history" className="inline-flex items-center gap-2 text-sm font-bold text-gym-accent">
        <ArrowLeft size={16} /> Storico
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-100">Cestino</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-none">Sessioni eliminate</h1>
          <p className="mt-2 text-sm text-gym-muted">Qui trovi gli allenamenti eliminati. Puoi ripristinarli o eliminarli definitivamente.</p>
        </div>
        <EmptyTrashAction hasSessions={sessions.length > 0} />
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
