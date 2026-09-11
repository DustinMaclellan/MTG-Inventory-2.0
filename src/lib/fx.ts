import type { UsdFx } from "./money";

const FALLBACK: UsdFx = { cad: 1, eur: 1 };

export async function usdFx(): Promise<UsdFx> {
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=CAD,EUR", {
      headers: { "User-Agent": "MysticLedger/1.0 (collection manager)" },
      next: { revalidate: 43_200 },
    });
    if (!response.ok) return FALLBACK;
    const data = (await response.json()) as { rates?: { CAD?: number; EUR?: number } };
    const cad = data.rates?.CAD;
    const eur = data.rates?.EUR;
    return {
      cad: typeof cad === "number" && Number.isFinite(cad) && cad > 0 ? cad : FALLBACK.cad,
      eur: typeof eur === "number" && Number.isFinite(eur) && eur > 0 ? eur : FALLBACK.eur,
    };
  } catch {
    return FALLBACK;
  }
}

export async function usdCadRate(): Promise<number> {
  return (await usdFx()).cad;
}
