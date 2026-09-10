import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeleteAccountForm, ManageBillingButton } from "@/components/billing-forms";
import { LanguageForm } from "@/components/locale-switcher";
import { dateLocale, getMessages, isLocale, pickPlural } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { hasEntitlement, trialDaysRemaining } from "@/lib/entitlements";
import { PasswordForm, PreferencesForm, ProfileForm } from "./settings-forms";

export const metadata = { title: "Settings" };

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

export default async function SettingsPage() {
  const user = await requireUser();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);
  const dates = dateLocale(locale);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8">
          <p className="text-sm text-zinc-500">{m.settings.eyebrow}</p>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">{m.settings.title}</h1>
        </header>

        <div className="space-y-6">
          <section className="panel p-6">
            <h2 className="text-sm font-semibold">{m.settings.language}</h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">{m.settings.languageBody}</p>
            <LanguageForm />
          </section>

          <section className="panel p-6">
            <h2 className="text-sm font-semibold">{m.settings.profile}</h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">{m.settings.profileBody}</p>
            <ProfileForm displayName={user.displayName} email={user.email} />
          </section>

          <section className="panel p-6">
            <h2 className="text-sm font-semibold">{m.settings.collection}</h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">{m.settings.collectionBody}</p>
            <PreferencesForm currency={user.preferredCurrency} />
          </section>

          <section className="panel p-6">
            <h2 className="text-sm font-semibold">{m.settings.billing}</h2>
            <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
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

          <section className="panel p-6">
            <h2 className="text-sm font-semibold">{m.settings.password}</h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">{m.settings.passwordBody}</p>
            <PasswordForm />
          </section>

          <section className="panel p-6">
            <h2 className="text-sm font-semibold text-rose-200">{m.settings.deleteAccount}</h2>
            <p className="mt-3 mb-5 text-sm leading-6 text-zinc-500">{m.settings.deleteBody}</p>
            <DeleteAccountForm />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
