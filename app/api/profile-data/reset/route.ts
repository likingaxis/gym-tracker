import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

type ResetAction = "trash_open_sessions" | "empty_trash" | "trash_sessions" | "delete_workout_data";

type Body = {
  action?: ResetAction;
};

export async function POST(request: Request) {
  try {
    const profileId = await getSelectedProfileId();
    if (!profileId) {
      return NextResponse.json({ success: false, error: "Seleziona un profilo." }, { status: 400 });
    }

    const body = (await request.json()) as Body;
    const action = body.action;

    if (!action) {
      return NextResponse.json({ success: false, error: "Azione mancante." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();

    if (action === "trash_open_sessions") {
      const { data, error } = await supabase
        .from("workout_sessions")
        .update({ deleted_at: now, deleted_reason: "reset_open", paused_at: null })
        .eq("profile_id", profileId)
        .in("status", ["in_progress", "paused"])
        .is("deleted_at", null)
        .select("id");

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, affected: data?.length ?? 0 });
    }

    if (action === "empty_trash") {
      const { data, error } = await supabase
        .from("workout_sessions")
        .delete()
        .eq("profile_id", profileId)
        .not("deleted_at", "is", null)
        .select("id");

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, affected: data?.length ?? 0 });
    }

    if (action === "trash_sessions") {
      const { data, error } = await supabase
        .from("workout_sessions")
        .update({ deleted_at: now, deleted_reason: "reset_history", paused_at: null })
        .eq("profile_id", profileId)
        .is("deleted_at", null)
        .select("id");

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, affected: data?.length ?? 0 });
    }

    if (action === "delete_workout_data") {
      const { data, error } = await supabase
        .from("workout_plans")
        .delete()
        .eq("profile_id", profileId)
        .select("id");

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, affected: data?.length ?? 0 });
    }

    return NextResponse.json({ success: false, error: "Azione non valida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore reset dati." },
      { status: 500 }
    );
  }
}
