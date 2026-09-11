import Link from "next/link";
import { ManageBillingButton } from "@/components/billing-forms";
import { dateLocale, getMessages, isLocale, pickPlural } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { hasEntitlement, trialDaysRemaining } from "@/lib/entitlements";

export const metadata = { title: "Billing" };

function statusLabel(user: Awaited<ReturnType<typeof requireUser>>) {
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const days = trialDaysRemaining(user);
  if (user.subscriptionStatus === "ACTIVE") return m.settings.statusActive;
  if (user.subscriptionStatus === "PAST_DUE") return m.settings.statusPastDue;
  if (user.subscriptionStatus === "CANCELED" && hasEntitlement(user)) return m.settings.statusCanceled;
  if (days !== null) return pickPlural(days, m.settings.statusTrial, m.settings.statusTrialPlural);
  if (hasEntitlement(user)) return m.settings.statusAccess;
  return m.settings.statusEnded;
}

export default async function SettingsBillingPage() {
  const user = await requireUser();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const dates = dateLocale(locale);

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{m.settings.billing}</h2>
      <p className="mt-1 mb-6 text-sm leading-6 text-zinc-500">{m.settings.billingBody}</p>
      <section className="panel p-6">
        <dl className="grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-600">{m.settings.status}</dt>
            <dd className="mt-1">{statusLabel(user)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-600">{m.settings.trialEnds}</dt>
            <dd className="mt-1">{user.trialEndsAt.toLocaleDateString(dates)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-600">{m.settings.periodEnd}</dt>
            <dd className="mt-1">{user.currentPeriodEnd?.toLocaleDateString(dates) ?? "—"}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/subscribe" className="button-secondary text-sm">
            {hasEntitlement(user) ? m.settings.changePlan : m.common.subscribe}
          </Link>
          <ManageBillingButton hasCustomer={Boolean(user.stripeCustomerId)} />
        </div>
      </section>
    </div>
  );
}
