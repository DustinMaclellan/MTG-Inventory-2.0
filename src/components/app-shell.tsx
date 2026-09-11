import Link from "next/link";
import type { User } from "@prisma/client";
import { LogOut, Settings, Sparkles } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { getMessages, isLocale, pickPlural } from "@/i18n";
import { trialBannerDaysRemaining } from "@/lib/entitlements";
import { MobileNav, NavLinks } from "@/components/nav-links";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User;
}) {
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const daysLeft = trialBannerDaysRemaining(user);

  const initials = user.displayName
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-white/6 bg-[#080a0d] p-4 lg:flex lg:flex-col">
        <Link
          href="/dashboard"
          className="mb-8 flex items-center gap-3 px-2 py-1 rounded-xl transition-colors hover:bg-white/3"
        >
          <span className="brand-mark grid size-9 shrink-0 place-items-center rounded-xl">
            <Sparkles size={18} />
          </span>
          <span>
            <strong className="block text-sm tracking-tight leading-tight">Mystic Ledger</strong>
            <small className="text-[10px] text-zinc-600 font-normal">{m.brand.tagline}</small>
          </span>
        </Link>

        <NavLinks />

        <div className="mt-auto pt-4 border-t border-white/6">
          <Link href="/settings" className="nav-link">
            <Settings size={17} /> {m.nav.settings}
          </Link>
          <form action={logoutAction}>
            <button className="nav-link w-full text-left">
              <LogOut size={17} /> {m.nav.signOut}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3 px-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent border border-accent/20">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-300">{user.displayName}</p>
              <p className="truncate text-[10px] text-zinc-600">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="pb-24 lg:ml-60 lg:pb-0">
        {daysLeft !== null && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent/15 bg-accent/6 px-5 py-2.5 text-sm text-zinc-100/90">
            <p className="text-xs">
              {pickPlural(daysLeft, m.trial.daysLeft, m.trial.daysLeftPlural)}
            </p>
            <Link
              href="/subscribe"
              className="text-xs font-semibold text-accent hover:text-white transition-colors"
            >
              {m.trial.subscribe}
            </Link>
          </div>
        )}
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
