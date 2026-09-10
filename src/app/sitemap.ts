import type { MetadataRoute } from "next";
import { appMetadataBase } from "@/lib/app-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appMetadataBase();
  if (!base) return [];
  const lastModified = new Date();
  return ["", "/pricing", "/terms", "/privacy", "/login", "/register"].map((path) => ({
    url: new URL(path || "/", base).toString(),
    lastModified,
  }));
}
