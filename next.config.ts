import type { NextConfig } from "next";

// Applied to every route. HSTS is included because browsers enforce it only
// over HTTPS; it is harmless in development (the browser ignores it on http).
const securityHeaders = [
  // Prevent browsers from MIME-sniffing a response away from the declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow embedding in iframes (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Only send origin in the Referer header; never full URL to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable hardware access APIs the app does not use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Tell browsers to only use HTTPS for 2 years (production-safe because
  // Vercel, Railway, etc. always serve over HTTPS).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js 16 requires 'unsafe-inline' and 'unsafe-eval' for its runtime
      // hydration. Remove them only if you later adopt nonce-based CSP.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind's utility classes are injected as inline styles.
      "style-src 'self' 'unsafe-inline'",
      // next/font/google self-hosts font files at build time — no external CDN needed.
      "font-src 'self'",
      // Card images are served directly from the Scryfall CDN.
      "img-src 'self' https://cards.scryfall.io data: blob:",
      // API calls are same-origin only.
      "connect-src 'self'",
      // Stripe Checkout hosted page is a redirect, not an iframe — no frame-src needed.
      "frame-src 'none'",
      // Belt-and-suspenders clickjacking block (more reliable than X-Frame-Options).
      "frame-ancestors 'none'",
      // Block Flash and other legacy plugins entirely.
      "object-src 'none'",
      // Prevent base-tag injection attacks.
      "base-uri 'self'",
      // Restrict form POST targets to the same origin and Stripe Checkout.
      "form-action 'self' https://checkout.stripe.com",
      // Upgrade any accidentally mixed HTTP sub-requests to HTTPS.
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cards.scryfall.io", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
