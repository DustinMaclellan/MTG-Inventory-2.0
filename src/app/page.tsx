import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Check,
  FileUp,
  Library,
  Lock,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { PLAN_MONTHLY_USD, PLAN_YEARLY_USD, TRIAL_DAYS } from "@/lib/constants";

const SAVINGS_PCT = Math.round(
  (1 - PLAN_YEARLY_USD / (PLAN_MONTHLY_USD * 12)) * 100,
);

const features = [
  {
    icon: Library,
    title: "Exact Scryfall printings",
    body: "Record the exact set, collector number, finish, condition, and quantity — not just a card name. Every printing is unique.",
  },
  {
    icon: Wallet,
    title: "Live portfolio value",
    body: "Prices sync from Scryfall daily. See market value, cost basis, and unrealized gain across your entire collection.",
  },
  {
    icon: Archive,
    title: "Storage location tracking",
    body: "Tag every lot with a binder, box, or shelf label. Filter by location to find any card in seconds.",
  },
  {
    icon: FileUp,
    title: "CSV import and full export",
    body: "Preview unresolved rows before they touch your inventory. Export everything as a clean CSV whenever you want it.",
  },
];

const trustItems = [
  "No credit card required",
  "Cancel anytime",
  "Your data stays private",
  "Powered by Scryfall",
];

export default function LandingPage() {
  return (
    <MarketingShell>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-5 py-20 sm:py-32">
        {/* Atmospheric glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-48 -top-32 h-[700px] w-[700px] rounded-full bg-emerald-500/6 blur-[130px]" />
          <div className="absolute -right-32 top-16 h-[500px] w-[500px] rounded-full bg-emerald-500/4 blur-[110px]" />
        </div>

        <div className="badge mb-6 w-fit">
          <Sparkles size={11} />
          Private MTG collection intelligence
        </div>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-[4.25rem] sm:leading-[1.08]">
          Know exactly what you own,{" "}
          <span className="gradient-text">what it&rsquo;s worth</span>,
          <br className="hidden sm:block" />
          {" "}and where it lives.
        </h1>

        <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
          Mystic Ledger tracks exact Scryfall printings — finish, condition, storage location, and
          live market value — all in one private, searchable ledger.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/register" className="button-primary text-[15px]">
            Start {TRIAL_DAYS}-day free trial
            <ArrowRight size={17} />
          </Link>
          <Link href="/pricing" className="button-secondary text-[15px]">
            See pricing
          </Link>
        </div>

        {/* Trust bar */}
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {trustItems.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-zinc-500">
              <Check size={13} className="shrink-0 text-emerald-500" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ── App preview mockup ────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-10" aria-label="Example collection dashboard">
        <div className="panel relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-emerald-400/6 blur-[80px]" aria-hidden />

          {/* Mock stats header */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Total collection value</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                $4,217<span className="text-zinc-500">.50</span>
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/6 px-4 py-2">
              <TrendingUp size={15} className="text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-300">+$2,277.50 unrealized</span>
            </div>
          </div>

          {/* Mock stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total cards", value: "648" },
              { label: "Unique cards", value: "284" },
              { label: "Cost basis", value: "$1,940" },
              { label: "Priced copies", value: "621 / 648" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-white/5 bg-white/[.025] p-4"
              >
                <p className="text-[11px] uppercase tracking-widest text-zinc-600">{label}</p>
                <p className="mt-2.5 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {/* Mock recent rows */}
          <div className="mt-5 overflow-hidden rounded-xl border border-white/5 bg-white/[.015]">
            <div className="border-b border-white/6 px-5 py-3">
              <p className="text-xs font-medium text-zinc-500">Recently added</p>
            </div>
            {[
              { name: "Rhystic Study", detail: "Commander Masters · #126 · nonfoil", qty: "× 1" },
              { name: "Jeweled Lotus", detail: "Commander Legends · #319 · foil", qty: "× 2" },
              { name: "Force of Will", detail: "Alliances · #62 · nonfoil", qty: "× 1" },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-zinc-600">{row.detail}</p>
                </div>
                <span className="text-sm text-zinc-500">{row.qty}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-right text-xs text-zinc-700">Example data — your real collection goes here</p>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8">
        <div className="mb-10 text-center">
          <p className="badge mx-auto w-fit mb-4">Everything you need</p>
          <h2 className="text-3xl font-semibold tracking-tight">
            A ledger built for serious collectors
          </h2>
          <p className="mt-4 text-zinc-500 max-w-lg mx-auto text-sm leading-6">
            No spreadsheets. No guesswork. Just your collection, priced to the exact printing.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {features.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="panel group p-6 transition-all duration-200 hover:border-emerald-400/15 hover:shadow-[0_24px_64px_rgba(0,0,0,.3)]"
            >
              <span className="grid size-10 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-400 transition-colors group-hover:bg-emerald-400/12">
                <Icon size={18} />
              </span>
              <h3 className="mt-5 text-[15px] font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-28">
        <div className="panel relative overflow-hidden px-8 py-12 sm:px-12 text-center">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[600px] rounded-full bg-emerald-400/6 blur-[80px]" />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              One plan. {TRIAL_DAYS} days free.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-zinc-400 text-sm leading-6">
              ${PLAN_MONTHLY_USD}/month or ${PLAN_YEARLY_USD}/year (save {SAVINGS_PCT}%).
              Your inventory stays yours — private, exportable, always.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className="button-primary text-[15px]">
                Start free trial — no card needed
                <ArrowRight size={17} />
              </Link>
              <Link href="/pricing" className="button-secondary text-[15px]">
                View pricing
              </Link>
            </div>
            <div className="mt-6 flex justify-center gap-5">
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Lock size={11} className="text-emerald-600" /> Private to your account
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Check size={11} className="text-emerald-600" /> Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
