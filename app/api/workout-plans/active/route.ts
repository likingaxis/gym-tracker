import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelectedProfileId } from "@/lib/profiles";

export async function GET() {
  const profileId = await getSelectedProfileId();

  if (!profileId) {
    return NextResponse.json({ success: true, plan: null });
  }

  const supabase = createServerSupabaseClient();

  const { data: plan, error } = await supabase
    .from("workout_plans")
    .select("*, workout_days(*, exercises(*))")
    .eq("is_active", true)
    .eq("profile_id", profileId)
    .order("day_order", { referencedTable: "workout_days", ascending: true })
    .order("exercise_order", { referencedTable: "workout_days.exercises", ascending: true })
    .maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, plan });
}
