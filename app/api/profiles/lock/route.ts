import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SELECTED_PROFILE_COOKIE } from "@/lib/profiles";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SELECTED_PROFILE_COOKIE);
  return NextResponse.json({ success: true });
}
