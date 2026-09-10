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
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#090b0e]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-black shadow-[0_0_30px_rgba(52,211,153,.15)]">
              <Sparkles size={20} />
            </span>
            <strong className="tracking-tight">Mystic Ledger</strong>
          </Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <Link href="/pricing" className="hidden px-3 py-2 text-zinc-400 hover:text-white sm:inline">
              Pricing
            </Link>
            {user ? (
              <Link href="/dashboard" className="button-primary text-sm">
                Open app
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 text-zinc-400 hover:text-white">
                  Sign in
                </Link>
                <Link href="/register" className="button-primary text-sm">
                  Start free trial
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/8 px-5 py-10 text-sm text-zinc-500">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl space-y-3 leading-6">
            <p>Card prices and imagery come from Scryfall. Card images are served from cards.scryfall.io.</p>
            <p>
              Magic: The Gathering is a trademark of Wizards of the Coast LLC. Mystic Ledger is unofficial
              fan software and is not affiliated with, endorsed, or sponsored by Wizards of the Coast.
            </p>
          </div>
          <div className="flex gap-4">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-emerald-400">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
