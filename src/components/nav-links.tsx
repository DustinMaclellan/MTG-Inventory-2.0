"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BarChart3,
  Boxes,
  CreditCard,
  FileUp,
  LayoutDashboard,
  Library,
  PlusCircle,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";

export function NavLinks() {
  const pathname = usePathname();
  const { m } = useI18n();
  const navigation = [
    { href: "/dashboard", label: m.nav.dashboard, icon: LayoutDashboard },
    { href: "/collection", label: m.nav.collection, icon: Library },
    { href: "/storage", label: m.nav.storage, icon: Archive },
    { href: "/add", label: m.nav.addCards, icon: PlusCircle },
    { href: "/imports", label: m.nav.importExport, icon: FileUp },
    { href: "/decks", label: m.nav.decks, icon: Boxes },
    { href: "/analytics", label: m.nav.analytics, icon: BarChart3 },
    { href: "/transactions", label: m.nav.transactions, icon: CreditCard, disabled: true },
  ];

  return (
    <nav className="space-y-0.5">
      {navigation.map(({ href, label, icon: Icon, disabled }) =>
        disabled ? (
          <span
            key={href}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-700 cursor-default"
          >
            <Icon size={17} />
            {label}
            <small className="ml-auto text-[10px] font-medium uppercase tracking-wider opacity-60">
              {m.nav.soon}
            </small>
          </span>
        ) : (
          <Link
            key={href}
            href={href}
            className={`nav-link ${
              pathname === href || (pathname.startsWith(href + "/") && href !== "/")
                ? "nav-link-active"
                : ""
            }`}
          >
            <Icon size={17} />
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { m } = useI18n();
  const navigation = [
    { href: "/dashboard", label: m.nav.dashboard, icon: LayoutDashboard },
    { href: "/collection", label: m.nav.collection, icon: Library },
    { href: "/analytics", label: m.nav.analytics, icon: BarChart3 },
    { href: "/storage", label: m.nav.storage, icon: Archive },
    { href: "/add", label: m.nav.addCards, icon: PlusCircle },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-white/8 bg-[#080a0d]/95 px-1 py-1.5 backdrop-blur lg:hidden">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors ${
              active ? "text-accent" : "text-zinc-500"
            }`}
          >
            <Icon size={19} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
