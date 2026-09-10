import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/constants";
import type { AppLocale } from "./config";

export async function persistLocaleCookie(locale: AppLocale) {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
