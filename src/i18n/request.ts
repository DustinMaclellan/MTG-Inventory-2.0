import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { LOCALE_COOKIE } from "@/lib/constants";
import { type AppLocale, isLocale } from "./config";
import { getMessages, type Messages } from "./index";

export async function getRequestLocale(): Promise<AppLocale> {
  const user = await getCurrentUser();
  if (user && isLocale(user.preferredLocale)) return user.preferredLocale;

  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;

  const accept = (await headers()).get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("fr")) return "fr";
  return "en";
}

export async function getRequestMessages(): Promise<{ locale: AppLocale; m: Messages }> {
  const locale = await getRequestLocale();
  return { locale, m: getMessages(locale) };
}
