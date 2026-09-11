export const ACCENTS = ["emerald", "sky", "violet", "amber", "rose", "cyan"] as const;
export type AccentName = (typeof ACCENTS)[number];

export const ACCENT_SWATCHES: Array<{
  id: AccentName;
  hex: string;
}> = [
  { id: "emerald", hex: "#4ade80" },
  { id: "sky", hex: "#38bdf8" },
  { id: "violet", hex: "#a78bfa" },
  { id: "amber", hex: "#fbbf24" },
  { id: "rose", hex: "#fb7185" },
  { id: "cyan", hex: "#22d3ee" },
];

export function isAccent(value: unknown): value is AccentName {
  return ACCENTS.includes(value as AccentName);
}

const BRAND_LOCKED_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/pricing",
] as const;

export function isBrandLockedPath(pathname: string | null | undefined) {
  return pathname != null && BRAND_LOCKED_PATHS.includes(pathname as (typeof BRAND_LOCKED_PATHS)[number]);
}
