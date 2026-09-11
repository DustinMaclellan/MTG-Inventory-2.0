import { cookies } from "next/headers";
import { ACCENT_COOKIE } from "@/lib/constants";
import { isAccent, type AccentName } from "@/lib/accent";

export async function persistAccentCookie(accent: AccentName) {
  (await cookies()).set(ACCENT_COOKIE, accent, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
