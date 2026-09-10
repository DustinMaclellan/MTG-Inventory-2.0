import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_MONTHLY_USD, PLAN_NAME, PLAN_YEARLY_USD, TRIAL_DAYS } from "@/lib/constants";
import { hasEntitlement } from "@/lib/entitlements";

export const metadata = { title: "Pricing" };

const features = [
  "Exact Scryfall printings, finishes, and conditions",
  "Portfolio value, cost basis, and storage locations",
  "CSV import with review, plus full export",
  "Private inventory scoped to your account",
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const entitled = user ? hasEntitlement(user) : false;
  const ctaHref = !user ? "/register" : entitled ? "/dashboard" : "/subscribe";
  const ctaLabel = !user ? `Start ${TRIAL_DAYS}-day free trial` : entitled ? "Open app" : "Subscribe";

  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
        <p className="text-sm font-medium text-emerald-400">Simple pricing</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">One plan. Fourteen days free.</h1>
        <p className="mt-4 text-zinc-400">
          Use the full app during your trial. After that, {PLAN_NAME} keeps your collection online.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <article className="panel p-6">
            <p className="text-sm text-zinc-500">Monthly</p>
            <p className="mt-3 text-4xl font-semibold">${PLAN_MONTHLY_USD}<span className="text-lg text-zinc-500">/mo</span></p>
            <p className="mt-3 text-sm text-zinc-500">Cancel anytime from the billing portal.</p>
          </article>
          <article className="panel p-6">
            <p className="text-sm text-emerald-400">Yearly</p>
            <p className="mt-3 text-4xl font-semibold">${PLAN_YEARLY_USD}<span className="text-lg text-zinc-500">/yr</span></p>
            <p className="mt-3 text-sm text-zinc-500">Two months free compared with paying monthly.</p>
          </article>
        </div>

        <ul className="mt-10 space-y-3 text-sm text-zinc-300">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check size={16} className="mt-0.5 text-emerald-400" />
              {feature}
            </li>
          ))}
        </ul>

        <Link href={ctaHref} className="button-primary mt-10">
          {ctaLabel}
        </Link>
      </section>
    </MarketingShell>
  );
}
