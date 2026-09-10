import Link from "next/link";
import { Sparkles } from "lucide-react";
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
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-emerald-500/4 blur-[120px]" />
      </div>

      <section className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400 text-black shadow-[0_0_20px_rgba(52,211,153,.25)] transition-shadow group-hover:shadow-[0_0_28px_rgba(52,211,153,.40)]">
              <Sparkles size={18} />
            </span>
            <strong className="text-sm tracking-tight">Mystic Ledger</strong>
          </Link>
          <LocaleSwitcher />
        </div>

        <div className="panel-raised p-7 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">{eyebrow}</p>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
