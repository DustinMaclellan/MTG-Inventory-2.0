import Link from "next/link";
import { Sparkles } from "lucide-react";
import { LandingAccentLock } from "@/components/landing-accent-lock";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function AuthChrome({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-12">
      <LandingAccentLock />
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full accent-wash blur-[120px]" />
      </div>

      <section className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <span className="brand-mark grid size-9 shrink-0 place-items-center rounded-xl transition-shadow">
              <Sparkles size={18} />
            </span>
            <strong className="text-sm tracking-tight">Mystic Ledger</strong>
          </Link>
          <LocaleSwitcher />
        </div>

        <div className="panel-raised p-7 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
