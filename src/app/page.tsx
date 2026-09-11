import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Boxes,
  Check,
  FileUp,
  Languages,
  Library,
  Lock,
  Sparkles,
  Wallet,
} from "lucide-react";
import { LandingDashboardPreview } from "@/components/landing-dashboard-preview";
import { MarketingShell } from "@/components/marketing-shell";
import { interpolate } from "@/i18n";
import { getRequestMessages } from "@/i18n/request";
import { PLAN_MONTHLY_USD, PLAN_YEARLY_USD, TRIAL_DAYS } from "@/lib/constants";

const SAVINGS_PCT = Math.round(
  (1 - PLAN_YEARLY_USD / (PLAN_MONTHLY_USD * 12)) * 100,
);

export default async function LandingPage() {
  const { locale, m } = await getRequestMessages();
  const features = [
    { icon: Library, title: m.marketing.featurePrintingsTitle, body: m.marketing.featurePrintingsBody },
    { icon: Wallet, title: m.marketing.featureValueTitle, body: m.marketing.featureValueBody },
    { icon: Archive, title: m.marketing.featureStorageTitle, body: m.marketing.featureStorageBody },
    { icon: Boxes, title: m.marketing.featureDecksTitle, body: m.marketing.featureDecksBody },
    { icon: FileUp, title: m.marketing.featureCsvTitle, body: m.marketing.featureCsvBody },
    { icon: Languages, title: m.marketing.featureLocaleTitle, body: m.marketing.featureLocaleBody },
  ];
  const trustItems = [
    m.marketing.trustNoCard,
    m.marketing.trustCancel,
    m.marketing.trustPrivate,
    m.marketing.trustScryfall,
  ];

  return (
    <MarketingShell>
      <section className="relative mx-auto max-w-6xl px-5 py-20 sm:py-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-48 -top-32 h-[700px] w-[700px] rounded-full bg-accent/6 blur-[130px]" />
          <div className="absolute -right-32 top-16 h-[500px] w-[500px] rounded-full bg-accent/4 blur-[110px]" />
        </div>

        <div className="badge mb-6 w-fit">
          <Sparkles size={11} />
          {m.marketing.badge}
        </div>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-[4.25rem] sm:leading-[1.08]">
          {m.marketing.heroTitleBefore}{" "}
          <span className="gradient-text">{m.marketing.heroTitleAccent}</span>
          {m.marketing.heroTitleAfter}
        </h1>

        <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
          {m.marketing.heroBody}
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/register" className="button-primary text-[15px]">
            {interpolate(m.marketing.startTrialDays, { days: TRIAL_DAYS })}
            <ArrowRight size={17} />
          </Link>
          <Link href="/pricing" className="button-secondary text-[15px]">
            {m.marketing.seePricing}
          </Link>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {trustItems.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-zinc-500">
              <Check size={13} className="shrink-0 text-accent" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10" aria-label={m.dashboard.title}>
        <LandingDashboardPreview locale={locale} m={m} />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8">
        <div className="mb-10 text-center">
          <p className="badge mx-auto w-fit mb-4">{m.marketing.featuresBadge}</p>
          <h2 className="text-3xl font-semibold tracking-tight">
            {m.marketing.featuresTitle}
          </h2>
          <p className="mt-4 text-zinc-500 max-w-lg mx-auto text-sm leading-6">
            {m.marketing.featuresBody}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="panel group p-6 transition-all duration-200 hover:border-accent/15 hover:shadow-[0_24px_64px_rgba(0,0,0,.3)]"
            >
              <span className="grid size-10 place-items-center rounded-xl border border-accent/20 bg-accent/8 text-accent transition-colors group-hover:bg-accent/12">
                <Icon size={18} />
              </span>
              <h3 className="mt-5 text-[15px] font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-28">
        <div className="panel relative overflow-hidden px-8 py-12 sm:px-12 text-center">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[600px] rounded-full bg-accent/6 blur-[80px]" />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {interpolate(m.marketing.ctaTitle, { days: TRIAL_DAYS })}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-zinc-400 text-sm leading-6">
              {interpolate(m.marketing.ctaBody, {
                monthly: PLAN_MONTHLY_USD,
                yearly: PLAN_YEARLY_USD,
                pct: SAVINGS_PCT,
              })}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className="button-primary text-[15px]">
                {m.marketing.ctaButton}
                <ArrowRight size={17} />
              </Link>
              <Link href="/pricing" className="button-secondary text-[15px]">
                {m.marketing.viewPricing}
              </Link>
            </div>
            <div className="mt-6 flex justify-center gap-5">
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Lock size={11} className="text-accent" /> {m.marketing.privateAccount}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Check size={11} className="text-accent" /> {m.marketing.cancelAnytime}
              </span>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
