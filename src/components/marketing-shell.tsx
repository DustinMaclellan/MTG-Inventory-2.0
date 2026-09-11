import Link from "next/link";
import { Sparkles } from "lucide-react";
import { LandingAccentLock } from "@/components/landing-accent-lock";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getRequestMessages } from "@/i18n/request";
import { getCurrentUser } from "@/lib/auth";

export async function MarketingShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const { m } = await getRequestMessages();
  const footerLinks = [
    { href: "/pricing", label: m.marketing.pricing },
    { href: "/terms", label: m.marketing.terms },
    { href: "/privacy", label: m.marketing.privacy },
  ];

  return (
    <div className="min-h-screen">
      <LandingAccentLock />
      <header className="sticky top-0 z-20 border-b border-white/6 bg-[#080a0d]/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="brand-mark grid size-9 shrink-0 place-items-center rounded-xl transition-shadow">
              <Sparkles size={18} />
            </span>
            <strong className="text-sm tracking-tight">Mystic Ledger</strong>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <LocaleSwitcher className="mr-1 hidden sm:inline-flex" />
            <Link
              href="/pricing"
              className="hidden px-3 py-2 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-white/4 sm:inline-block"
            >
              {m.marketing.pricing}
            </Link>
            {user ? (
              <Link href="/dashboard" className="button-primary text-sm">
                {m.common.openApp}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-white/4"
                >
                  {m.marketing.signIn}
                </Link>
                <Link href="/register" className="button-primary text-sm ml-1">
                  {m.marketing.startTrial}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-white/6 px-5 py-10 text-xs text-zinc-600">
        <div className="mx-auto max-w-6xl space-y-6">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <span className="brand-mark grid size-7 shrink-0 place-items-center rounded-lg">
              <Sparkles size={13} />
            </span>
            <strong className="text-xs text-zinc-400">Mystic Ledger</strong>
          </Link>

          <div className="max-w-xl space-y-2 leading-5">
            <p>{m.marketing.footerPrices}</p>
            <p>{m.marketing.footerLegal}</p>
          </div>

          <div className="flex flex-wrap items-center gap-5 border-t border-white/5 pt-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-accent transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <LocaleSwitcher className="sm:hidden" />
          </div>
        </div>
      </footer>
    </div>
  );
}
