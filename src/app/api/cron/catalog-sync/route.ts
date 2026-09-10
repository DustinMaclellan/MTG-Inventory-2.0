import { NextResponse } from "next/server";
import { syncCatalog } from "@/services/catalog-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Accept the secret only through request headers, never query parameters,
  // to prevent the secret from appearing in server access logs.
  const bearer = request.headers.get("authorization");
  const custom = request.headers.get("x-cron-secret");
  const fromBearer = bearer?.startsWith("Bearer ") ? bearer.slice(7) : "";
  return fromBearer === secret || custom === secret;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncCatalog();
  return NextResponse.json(result);
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
