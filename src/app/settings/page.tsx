import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeleteAccountForm, ManageBillingButton } from "@/components/billing-forms";
import { requireUser } from "@/lib/auth";
import { hasEntitlement, trialDaysRemaining } from "@/lib/entitlements";
import { PasswordForm, PreferencesForm, ProfileForm } from "./settings-forms";

export const metadata = { title: "Settings" };

function statusLabel(user: Awaited<ReturnType<typeof requireUser>>) {
  const days = trialDaysRemaining(user);
  if (user.subscriptionStatus === "ACTIVE") return "Active subscription";
  if (user.subscriptionStatus === "PAST_DUE") return "Payment past due";
  if (user.subscriptionStatus === "CANCELED" && hasEntitlement(user)) return "Canceled — access until period end";
  if (days !== null) return `Free trial · ${days} day${days === 1 ? "" : "s"} left`;
  if (hasEntitlement(user)) return "Access active";
  return "Trial ended";
}

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8">
          <p className="text-sm text-zinc-500">Account</p>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">Settings</h1>
        </header>

        <div className="space-y-6">
          <section className="panel p-6">
            <h2 className="text-sm font-semibold">Profile</h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">
              Your name appears in the sidebar and on the dashboard greeting.
            </p>
            <ProfileForm displayName={user.displayName} email={user.email} />
          </section>

          <section className="panel p-6">
            <h2 className="text-sm font-semibold">Collection</h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">
              How market values are shown across the app.
            </p>
            <PreferencesForm currency={user.preferredCurrency} />
          </section>

          <section className="panel p-6">
            <h2 className="text-sm font-semibold">Billing</h2>
            <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-zinc-600">Status</dt>
                <dd className="mt-1">{statusLabel(user)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-zinc-600">Trial ends</dt>
                <dd className="mt-1">{user.trialEndsAt.toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-zinc-600">Current period end</dt>
                <dd className="mt-1">{user.currentPeriodEnd?.toLocaleDateString() ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/subscribe" className="button-secondary text-sm">
                {hasEntitlement(user) ? "Change plan" : "Subscribe"}
              </Link>
              <ManageBillingButton hasCustomer={Boolean(user.stripeCustomerId)} />
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="text-sm font-semibold">Password</h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">
              Changing your password signs out every other device.
            </p>
            <PasswordForm />
          </section>

          <section className="panel p-6">
            <h2 className="text-sm font-semibold text-rose-200">Delete account</h2>
            <p className="mt-3 mb-5 text-sm leading-6 text-zinc-500">
              This permanently removes your profile, sessions, decks, and inventory. Stripe may keep invoices for a canceled subscription.
            </p>
            <DeleteAccountForm />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
