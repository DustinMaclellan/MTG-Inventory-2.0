import type { MetadataRoute } from "next";
import { appMetadataBase } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  const base = appMetadataBase();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/terms", "/privacy", "/login", "/register"],
      disallow: [
        "/dashboard",
        "/collection",
        "/storage",
        "/add",
        "/imports",
        "/settings",
        "/subscribe",
        "/decks",
        "/api/",
      ],
    },
    ...(base ? { sitemap: new URL("/sitemap.xml", base).toString() } : {}),
  };
}
