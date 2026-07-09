import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SELECTED_PROFILE_COOKIE } from "@/lib/profiles";
import { isValidPin, verifyPin } from "@/lib/pin";

type SelectProfileBody = {
  profile_id?: string;
  pin?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SelectProfileBody;

    if (!body.profile_id) {
      return NextResponse.json({ success: false, error: "profile_id obbligatorio." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("app_profiles")
      .select("id, pin_enabled, pin_hash")
      .eq("id", body.profile_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "Profilo non trovato." }, { status: 404 });
    }

    if (data.pin_enabled) {
      if (!isValidPin(body.pin) || !verifyPin(body.pin, data.pin_hash)) {
        return NextResponse.json({ success: false, error: "PIN non corretto." }, { status: 401 });
      }
    }

    const cookieStore = await cookies();
    cookieStore.set(SELECTED_PROFILE_COOKIE, body.profile_id, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore selezione profilo." },
      { status: 500 },
    );
  }
}
