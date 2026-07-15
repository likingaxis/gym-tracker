import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profileId = await getSelectedProfileId();

  if (!profileId) {
    return NextResponse.json({ success: false, error: "Seleziona un profilo." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: session, error: readError } = await supabase
    .from("workout_sessions")
    .select("id, status, paused_at, total_paused_seconds")
    .eq("id", id)
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .single();

  if (readError || !session) {
    return NextResponse.json({ success: false, error: readError?.message ?? "Sessione non trovata." }, { status: 404 });
  }

  const pausedAt = session.paused_at ? new Date(session.paused_at).getTime() : null;
  const elapsed = pausedAt && Number.isFinite(pausedAt) ? Math.max(0, Math.round((Date.now() - pausedAt) / 1000)) : 0;
  const totalPausedSeconds = Number(session.total_paused_seconds ?? 0) + elapsed;

  const { data, error } = await supabase
    .from("workout_sessions")
    .update({ status: "in_progress", paused_at: null, total_paused_seconds: totalPausedSeconds })
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("id, status, paused_at, total_paused_seconds")
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: error?.message ?? "Sessione non aggiornata." }, { status: 500 });
  }

  return NextResponse.json({ success: true, session: data });
}
