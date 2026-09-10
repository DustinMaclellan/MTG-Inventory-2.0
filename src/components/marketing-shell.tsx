import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const footerLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export async function MarketingShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/6 bg-[#080a0d]/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,.30)] transition-shadow group-hover:shadow-[0_0_28px_rgba(52,211,153,.45)]">
              <Sparkles size={18} />
            </span>
            <strong className="text-sm tracking-tight">Mystic Ledger</strong>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/pricing"
              className="hidden px-3 py-2 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-white/4 sm:inline-block"
            >
              Pricing
            </Link>
            {user ? (
              <Link href="/dashboard" className="button-primary text-sm">
                Open app
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-white/4"
                >
                  Sign in
                </Link>
                <Link href="/register" className="button-primary text-sm ml-1">
                  Start free trial
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Page content ──────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-white/6 px-5 py-10 text-xs text-zinc-600">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-400 text-black">
              <Sparkles size={13} />
            </span>
            <strong className="text-xs text-zinc-400">Mystic Ledger</strong>
          </Link>

          {/* Legal text */}
          <div className="max-w-xl space-y-2 leading-5">
            <p>Card prices and imagery come from Scryfall. Images are served from cards.scryfall.io.</p>
            <p>
              Magic: The Gathering is a trademark of Wizards of the Coast LLC. Mystic Ledger is
              unofficial fan software and is not affiliated with, endorsed, or sponsored by Wizards
              of the Coast.
            </p>
          </div>

          {/* Bottom row: links */}
          <div className="flex items-center gap-5 border-t border-white/5 pt-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-emerald-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
