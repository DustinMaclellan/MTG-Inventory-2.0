import Link from "next/link";
import { Archive, FileUp, Library, Sparkles, Wallet } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { PLAN_MONTHLY_USD, PLAN_YEARLY_USD, TRIAL_DAYS } from "@/lib/constants";

export default function LandingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <p className="text-sm font-medium text-emerald-400">Private MTG collection intelligence</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Know exactly what you own, what it is worth, and where it lives.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
          Mystic Ledger tracks exact Scryfall printings, market value, storage locations, and CSV
          import/export. Start with a {`${TRIAL_DAYS}-day`} free trial. No card required.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="button-primary">
            {`Start ${TRIAL_DAYS}-day free trial`}
          </Link>
          <Link href="/pricing" className="button-secondary">
            See pricing
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-20 md:grid-cols-2">
        {[
          {
            icon: Library,
            title: "Exact printings",
            body: "Search real Scryfall printings and record quantity, finish, condition, and what you paid.",
          },
          {
            icon: Wallet,
            title: "Portfolio value",
            body: "See market value, cost basis, and unrealized gain from persisted Scryfall prices.",
          },
          {
            icon: Archive,
            title: "Storage locations",
            body: "Group lots by binder, box, or shelf so you can find a card without guessing.",
          },
          {
            icon: FileUp,
            title: "CSV import and export",
            body: "Preview unresolved rows before they land in your inventory. Export anytime.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <article key={title} className="panel p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400">
              <Icon size={18} />
            </span>
            <h2 className="mt-5 text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="panel relative overflow-hidden p-8 sm:p-10">
          <div className="absolute -right-16 -top-20 size-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 text-emerald-400" size={20} />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">One plan after the trial</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                ${PLAN_MONTHLY_USD}/month or ${PLAN_YEARLY_USD}/year unlocks the full collection manager.
                Your inventory stays private to your account.
              </p>
              <Link href="/register" className="button-primary mt-6 text-sm">
                Create your ledger
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
