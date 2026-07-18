"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateBodyData(profileId: string, data: { gender: string | null; birth_date: string | null; height_cm: number | null; weight_kg: number | null }) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("app_profiles")
    .update({
      gender: data.gender,
      birth_date: data.birth_date,
      height_cm: data.height_cm,
      weight_kg: data.weight_kg,
    })
    .eq("id", profileId);

  if (error) {
    throw new Error(error.message);
  }
}
