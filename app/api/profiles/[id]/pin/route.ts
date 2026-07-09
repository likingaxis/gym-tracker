import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { getSelectedProfileId } from "@/lib/profiles";

type Params = {
  params: Promise<{ id: string }>;
};

type SetPinBody = {
  current_pin?: string;
  new_pin?: string;
  confirm_pin?: string;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const selectedProfileId = await getSelectedProfileId();

    if (selectedProfileId !== id) {
      return NextResponse.json({ success: false, error: "Seleziona il profilo prima di modificare il PIN." }, { status: 403 });
    }

    const body = (await request.json()) as SetPinBody;

    if (!isValidPin(body.new_pin)) {
      return NextResponse.json({ success: false, error: "Il nuovo PIN deve avere esattamente 4 cifre." }, { status: 400 });
    }

    if (body.new_pin !== body.confirm_pin) {
      return NextResponse.json({ success: false, error: "I due PIN non coincidono." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: profile, error: readError } = await supabase
      .from("app_profiles")
      .select("id, pin_enabled, pin_hash")
      .eq("id", id)
      .single();

    if (readError || !profile) {
      return NextResponse.json({ success: false, error: "Profilo non trovato." }, { status: 404 });
    }

    if (profile.pin_enabled) {
      if (!isValidPin(body.current_pin) || !verifyPin(body.current_pin, profile.pin_hash)) {
        return NextResponse.json({ success: false, error: "PIN attuale non corretto." }, { status: 401 });
      }
    }

    const { error: updateError } = await supabase
      .from("app_profiles")
      .update({ pin_enabled: true, pin_hash: hashPin(body.new_pin) })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore salvataggio PIN." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const selectedProfileId = await getSelectedProfileId();

    if (selectedProfileId !== id) {
      return NextResponse.json({ success: false, error: "Seleziona il profilo prima di rimuovere il PIN." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as { current_pin?: string }));
    const supabase = createServerSupabaseClient();
    const { data: profile, error: readError } = await supabase
      .from("app_profiles")
      .select("id, pin_enabled, pin_hash")
      .eq("id", id)
      .single();

    if (readError || !profile) {
      return NextResponse.json({ success: false, error: "Profilo non trovato." }, { status: 404 });
    }

    if (profile.pin_enabled) {
      if (!isValidPin(body.current_pin) || !verifyPin(body.current_pin, profile.pin_hash)) {
        return NextResponse.json({ success: false, error: "PIN attuale non corretto." }, { status: 401 });
      }
    }

    const { error: updateError } = await supabase
      .from("app_profiles")
      .update({ pin_enabled: false, pin_hash: null })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Errore rimozione PIN." },
      { status: 500 },
    );
  }
}
