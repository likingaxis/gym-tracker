import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

type ResetAction = "abandon_in_progress" | "delete_abandoned" | "delete_sessions" | "delete_workout_data";

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

    if (action === "abandon_in_progress") {
      const { data, error } = await supabase
        .from("workout_sessions")
        .update({ status: "abandoned", completed_at: new Date().toISOString() })
        .eq("profile_id", profileId)
        .eq("status", "in_progress")
        .select("id");

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, affected: data?.length ?? 0 });
    }

    if (action === "delete_abandoned") {
      const { data, error } = await supabase
        .from("workout_sessions")
        .delete()
        .eq("profile_id", profileId)
        .eq("status", "abandoned")
        .select("id");

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, affected: data?.length ?? 0 });
    }

    if (action === "delete_sessions") {
      const { data, error } = await supabase
        .from("workout_sessions")
        .delete()
        .eq("profile_id", profileId)
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
