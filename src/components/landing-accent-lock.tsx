"use client";

import { useLayoutEffect } from "react";
import { isAccent } from "@/lib/accent";
import { ACCENT_COOKIE } from "@/lib/constants";

function cookieAccent() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${ACCENT_COOKIE}=([^;]*)`));
  const value = match?.[1] ? decodeURIComponent(match[1]) : "emerald";
  return isAccent(value) ? value : "emerald";
}

/** Keeps public marketing and sign-in pages on the default brand color during client navigations. */
export function LandingAccentLock() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-accent", "emerald");
    return () => {
      html.setAttribute("data-accent", cookieAccent());
    };
  }, []);
  return null;
}
