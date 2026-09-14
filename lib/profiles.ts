import { cookies } from "next/headers";

export const SELECTED_PROFILE_COOKIE = "gym_selected_profile_id";

export async function getSelectedProfileId(request?: Request) {
  if (request) {
    const headerProfileId = request.headers.get("x-profile-id");
    if (headerProfileId && headerProfileId.trim()) {
      return headerProfileId.trim();
    }
  }
  const cookieStore = await cookies();
  return cookieStore.get(SELECTED_PROFILE_COOKIE)?.value ?? null;
}
