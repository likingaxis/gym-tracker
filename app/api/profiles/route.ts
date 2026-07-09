import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CreateProfileBody = {
  name?: string;
  avatar_emoji?: string;
  color?: string;
};

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("app_profiles")
      .select("id, name, avatar_emoji, color, pin_enabled, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profiles: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore caricamento profili." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateProfileBody;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ success: false, error: "Il nome profilo è obbligatorio." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("app_profiles")
      .insert({
        name,
        avatar_emoji: body.avatar_emoji?.trim() || "🏋️",
        color: body.color?.trim() || "lime",
        pin_enabled: false,
      })
      .select("id, name, avatar_emoji, color, pin_enabled, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: error?.message ?? "Errore creazione profilo." }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore creazione profilo." },
      { status: 500 },
    );
  }
}
