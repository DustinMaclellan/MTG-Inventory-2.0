export function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Accept the secret only through request headers, never query parameters,
  // to prevent the secret from appearing in server access logs.
  const bearer = request.headers.get("authorization");
  const custom = request.headers.get("x-cron-secret");
  const fromBearer = bearer?.startsWith("Bearer ") ? bearer.slice(7) : "";
  return fromBearer === secret || custom === secret;
}
