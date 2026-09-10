import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_MONTHLY_USD, PLAN_NAME, PLAN_YEARLY_USD, TRIAL_DAYS } from "@/lib/constants";
import { hasEntitlement } from "@/lib/entitlements";

export const metadata = { title: "Pricing" };

const SAVINGS_PCT = Math.round(
  (1 - PLAN_YEARLY_USD / (PLAN_MONTHLY_USD * 12)) * 100,
);

const features = [
  "Exact Scryfall printings — set, number, finish, and condition",
  "Live portfolio value, cost basis, and unrealized gain",
  "Storage location tracking and search",
  "CSV import with preview, plus full export at any time",
  "Your inventory stays private — scoped to your account only",
  `${TRIAL_DAYS}-day free trial with full access, no card required`,
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const entitled = user ? hasEntitlement(user) : false;
  const ctaHref = !user ? "/register" : entitled ? "/dashboard" : "/subscribe";
  const ctaLabel = !user
    ? `Start ${TRIAL_DAYS}-day free trial`
    : entitled
    ? "Open app"
    : "Subscribe now";

  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <div className="text-center">
          <div className="badge mx-auto w-fit mb-5">Simple pricing</div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            One plan.{" "}
            <span className="gradient-text">Fourteen days free.</span>
          </h1>
          <p className="mt-5 text-zinc-500 max-w-sm mx-auto leading-6">
            Full access during your trial. {PLAN_NAME} keeps your collection running after that.
          </p>
        </div>

        {/* Plan cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {/* Monthly */}
          <article className="panel p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monthly</p>
            <div className="mt-4 flex items-end gap-1.5">
              <span className="text-4xl font-semibold">${PLAN_MONTHLY_USD}</span>
              <span className="mb-1 text-zinc-500 text-sm">/month</span>
            </div>
            <p className="mt-4 text-xs leading-5 text-zinc-600">
              Billed month-to-month. Cancel from the billing portal at any time.
            </p>
          </article>

          {/* Yearly */}
          <article className="panel relative overflow-hidden border-emerald-400/20 p-7">
            <div className="absolute inset-0 bg-emerald-400/3 pointer-events-none" aria-hidden />
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Yearly</p>
              <span className="badge">Save {SAVINGS_PCT}%</span>
            </div>
            <div className="mt-4 flex items-end gap-1.5">
              <span className="text-4xl font-semibold">${PLAN_YEARLY_USD}</span>
              <span className="mb-1 text-zinc-500 text-sm">/year</span>
            </div>
            <p className="mt-4 text-xs leading-5 text-zinc-600">
              Equivalent to ${(PLAN_YEARLY_USD / 12).toFixed(2)}/month.{" "}
              Two months free vs. monthly billing.
            </p>
          </article>
        </div>

        {/* Feature list */}
        <div className="mt-10 panel p-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-5">
            Everything included in both plans
          </p>
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link href={ctaHref} className="button-primary text-[15px]">
            {ctaLabel}
            <ArrowRight size={17} />
          </Link>
          {!user && (
            <p className="mt-4 text-xs text-zinc-600">
              No credit card required for the trial. Cancel anytime after.
            </p>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}
