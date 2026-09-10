import Link from "next/link";
import { Sparkles } from "lucide-react";

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
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-black">
            <Sparkles size={20} />
          </span>
          <strong>Mystic Ledger</strong>
        </Link>
        <div className="panel p-6 sm:p-8">
          <p className="text-sm text-emerald-400">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
