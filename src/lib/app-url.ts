export function appUrl() {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  // VERCEL_PROJECT_PRODUCTION_URL is the stable custom domain on Vercel.
  // VERCEL_URL changes every deployment (e.g. preview branches) and must NOT
  // be used for Stripe success/cancel URLs or password-reset links in production.
  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionDomain) return `https://${productionDomain.replace(/\/$/, "")}`;

  if (process.env.NODE_ENV === "production") {
    // Fail loudly so a misconfigured deployment is obvious immediately.
    throw new Error(
      "APP_URL must be set in production. " +
        "Set it to your public domain, e.g. https://mysticledger.app",
    );
  }

  return "http://localhost:3000";
}
