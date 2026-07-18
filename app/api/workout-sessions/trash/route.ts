import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

export async function DELETE() {
  try {
    const profileId = await getSelectedProfileId();
    if (!profileId) {
      return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Elimina fisicamente dal database le sessioni che hanno deleted_at popolato
    const { error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("profile_id", profileId)
      .not("deleted_at", "is", null);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Errore imprevisto" }, { status: 500 });
  }
}
