import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profileId = await getSelectedProfileId();

  if (!profileId) {
    return NextResponse.json({ success: false, error: "Seleziona un profilo." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId)
    .not("deleted_at", "is", null)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: error?.message ?? "Sessione eliminata non trovata." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
