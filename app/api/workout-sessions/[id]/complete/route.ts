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

  const { data, error } = await supabase
    .from("workout_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", profileId)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: error?.message ?? "Sessione non trovata." }, { status: 500 });
  }

  return NextResponse.json({ success: true, session_id: data.id });
}
