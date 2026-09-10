import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { refreshOwnedPrices } from "@/services/price-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await refreshOwnedPrices();
  return NextResponse.json(result);
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
