"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Settings, Shield, SlidersHorizontal, User } from "lucide-react";
import { useI18n } from "@/i18n/provider";

const sections = [
  { href: "/settings/profile", key: "profile" as const, icon: User },
  { href: "/settings/preferences", key: "preferences" as const, icon: SlidersHorizontal },
  { href: "/settings/billing", key: "billing" as const, icon: CreditCard },
  { href: "/settings/security", key: "security" as const, icon: Shield },
];

export function SettingsAppLink({ label }: { label: string }) {
  const pathname = usePathname();
  const active = pathname === "/settings" || pathname.startsWith("/settings/");
  return (
    <Link href="/settings" className={`nav-link ${active ? "nav-link-active" : ""}`}>
      <Settings size={17} /> {label}
    </Link>
  );
}

export function SettingsNav() {
  const pathname = usePathname();
  const { m } = useI18n();

  return (
    <nav
      aria-label={m.settings.title}
      className="grid grid-cols-2 gap-1 lg:sticky lg:top-8 lg:flex lg:w-52 lg:shrink-0 lg:flex-col"
    >
      {sections.map(({ href, key, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors lg:justify-start ${
              active
                ? "bg-accent/8 text-accent"
                : "text-zinc-500 hover:bg-white/4 hover:text-zinc-200"
            }`}
          >
            <Icon size={16} />
            {m.settings[key]}
          </Link>
        );
      })}
    </nav>
  );
}
