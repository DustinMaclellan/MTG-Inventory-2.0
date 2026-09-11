import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { isAccent, isBrandLockedPath, type AccentName } from "@/lib/accent";
import { ACCENT_COOKIE } from "@/lib/constants";

export async function getRequestAccent(): Promise<AccentName> {
  const pathname = (await headers()).get("x-pathname");
  if (isBrandLockedPath(pathname)) return "emerald";

  const user = await getCurrentUser();
  if (user && isAccent(user.preferredAccent)) return user.preferredAccent;

  const cookie = (await cookies()).get(ACCENT_COOKIE)?.value;
  if (isAccent(cookie)) return cookie;
  return "emerald";
}
