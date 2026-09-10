const FALLBACK_USD_CAD = 1;

export async function usdCadRate(): Promise<number> {
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=CAD", {
      headers: { "User-Agent": "MysticLedger/1.0 (collection manager)" },
      next: { revalidate: 43_200 },
    });
    if (!response.ok) return FALLBACK_USD_CAD;
    const data = (await response.json()) as { rates?: { CAD?: number } };
    const rate = data.rates?.CAD;
    return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : FALLBACK_USD_CAD;
  } catch {
    return FALLBACK_USD_CAD;
  }
}
