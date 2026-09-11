import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { interpolate } from "@/i18n";
import { getRequestMessages } from "@/i18n/request";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_MONTHLY_USD, PLAN_NAME, PLAN_YEARLY_USD, TRIAL_DAYS } from "@/lib/constants";
import { hasEntitlement } from "@/lib/entitlements";

export const metadata = { title: "Pricing" };

const SAVINGS_PCT = Math.round(
  (1 - PLAN_YEARLY_USD / (PLAN_MONTHLY_USD * 12)) * 100,
);

export default async function PricingPage() {
  const user = await getCurrentUser();
  const { m } = await getRequestMessages();
  const entitled = user ? hasEntitlement(user) : false;
  const ctaHref = !user ? "/register" : entitled ? "/dashboard" : "/subscribe";
  const ctaLabel = !user
    ? interpolate(m.marketing.startTrialDays, { days: TRIAL_DAYS })
    : entitled
    ? m.common.openApp
    : m.marketing.subscribeNow;
  const features = [
    m.marketing.pricingFeature1,
    m.marketing.pricingFeature2,
    m.marketing.pricingFeature3,
    m.marketing.pricingFeature4,
    m.marketing.pricingFeature5,
    m.marketing.pricingFeature6,
    m.marketing.pricingFeature7,
    interpolate(m.marketing.pricingFeature8, { days: TRIAL_DAYS }),
  ];

  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <div className="text-center">
          <div className="badge mx-auto w-fit mb-5">{m.marketing.simplePricing}</div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {m.marketing.pricingTitle}{" "}
            <span className="gradient-text">{m.marketing.pricingTitleAccent}</span>
          </h1>
          <p className="mt-5 text-zinc-500 max-w-sm mx-auto leading-6">
            {interpolate(m.marketing.pricingIntro, { plan: PLAN_NAME })}
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <article className="panel p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{m.marketing.monthly}</p>
            <div className="mt-4 flex items-end gap-1.5">
              <span className="text-4xl font-semibold">${PLAN_MONTHLY_USD}</span>
              <span className="mb-1 text-zinc-500 text-sm">{m.marketing.perMonth}</span>
            </div>
            <p className="mt-4 text-xs leading-5 text-zinc-600">
              {m.marketing.monthlyNote}
            </p>
          </article>

          <article className="panel relative overflow-hidden border-accent/20 p-7">
            <div className="absolute inset-0 bg-accent/3 pointer-events-none" aria-hidden />
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">{m.marketing.yearly}</p>
              <span className="badge">{interpolate(m.marketing.savePct, { pct: SAVINGS_PCT })}</span>
            </div>
            <div className="mt-4 flex items-end gap-1.5">
              <span className="text-4xl font-semibold">${PLAN_YEARLY_USD}</span>
              <span className="mb-1 text-zinc-500 text-sm">{m.marketing.perYear}</span>
            </div>
            <p className="mt-4 text-xs leading-5 text-zinc-600">
              {interpolate(m.marketing.yearlyNote, { monthly: (PLAN_YEARLY_USD / 12).toFixed(2) })}
            </p>
          </article>
        </div>

        <div className="mt-10 panel p-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-5">
            {m.marketing.everythingIncluded}
          </p>
          <ul className="space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                <Check size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 text-center">
          <Link href={ctaHref} className="button-primary text-[15px]">
            {ctaLabel}
            <ArrowRight size={17} />
          </Link>
          {!user && (
            <p className="mt-4 text-xs text-zinc-600">
              {m.marketing.noCardTrial}
            </p>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}
