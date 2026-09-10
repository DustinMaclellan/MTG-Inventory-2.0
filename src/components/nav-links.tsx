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

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "Collection", icon: Library },
  { href: "/storage", label: "Storage", icon: Archive },
  { href: "/add", label: "Add Cards", icon: PlusCircle },
  { href: "/imports", label: "Import / Export", icon: FileUp },
  { href: "/decks", label: "Decks", icon: Boxes },
  { href: "/analytics", label: "Analytics", icon: BarChart3, disabled: true },
  { href: "/transactions", label: "Transactions", icon: CreditCard, disabled: true },
];

export function NavLinks() {
  const pathname = usePathname();

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
            <small className="ml-auto text-[10px] font-medium uppercase tracking-wider opacity-60">Soon</small>
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

/** Compact bottom-bar navigation for mobile (≤ lg breakpoint) */
export function MobileNav() {
  const pathname = usePathname();
  const mobileItems = navigation.slice(0, 4).filter((n) => !n.disabled);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-white/8 bg-[#080a0d]/95 px-1 py-1.5 backdrop-blur lg:hidden">
      {mobileItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-[10px] font-medium transition-colors ${
              active ? "text-emerald-400" : "text-zinc-500"
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
