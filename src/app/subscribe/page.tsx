import Link from "next/link";
import { Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CheckoutForm } from "@/components/checkout-form";
import { getMessages, interpolate, isLocale, pickPlural } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { PLAN_NAME, TRIAL_DAYS } from "@/lib/constants";
import { hasEntitlement, trialDaysRemaining } from "@/lib/entitlements";

export const metadata = { title: "Subscribe" };

export default async function SubscribePage() {
  const user = await requireUser();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const entitled = hasEntitlement(user);
  const daysLeft = trialDaysRemaining(user);
  const planFeatures = [
    m.subscribe.feature1,
    m.subscribe.feature2,
    m.subscribe.feature3,
    m.subscribe.feature4,
    m.subscribe.feature5,
  ];

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-2">
            {PLAN_NAME}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {entitled ? m.subscribe.upgrade : m.subscribe.trialEnded}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {entitled && daysLeft !== null
              ? pickPlural(daysLeft, m.subscribe.remaining, m.subscribe.remainingPlural)
              : entitled
              ? m.subscribe.alreadyActive
              : interpolate(m.subscribe.over, { days: TRIAL_DAYS })}
          </p>
        </div>

        <div className="panel mb-8 p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {m.subscribe.getting}
          </p>
          <ul className="space-y-2.5">
            {planFeatures.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
                <Check size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <CheckoutForm />

        <p className="mt-6 text-center text-sm text-zinc-600">
          {m.subscribe.already}{" "}
          <Link href="/settings" className="font-medium text-accent hover:text-accent-hover transition-colors">
            {m.subscribe.manage}
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
