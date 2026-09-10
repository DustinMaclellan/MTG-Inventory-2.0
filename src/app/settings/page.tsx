import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeleteAccountForm, ManageBillingButton } from "@/components/billing-forms";
import { requireUser } from "@/lib/auth";
import { hasEntitlement, trialDaysRemaining } from "@/lib/entitlements";

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
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

        <section className="panel mt-8 p-6">
          <h2 className="font-medium">Billing</h2>
          <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-600">Status</dt>
              <dd className="mt-1">{statusLabel(user)}</dd>
            </div>
            <div>
              <dt className="text-zinc-600">Trial ends</dt>
              <dd className="mt-1">{user.trialEndsAt.toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-zinc-600">Current period end</dt>
              <dd className="mt-1">{user.currentPeriodEnd?.toLocaleDateString() ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-600">Account email</dt>
              <dd className="mt-1">{user.email}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/subscribe" className="button-secondary text-sm">
              {hasEntitlement(user) ? "Change plan" : "Subscribe"}
            </Link>
            <ManageBillingButton hasCustomer={Boolean(user.stripeCustomerId)} />
          </div>
        </section>

        <section className="panel mt-8 p-6">
          <h2 className="font-medium">Pricing preferences</h2>
          <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
            <div><dt className="text-zinc-600">Provider</dt><dd className="mt-1">Scryfall</dd></div>
            <div><dt className="text-zinc-600">Metric</dt><dd className="mt-1">Market</dd></div>
            <div><dt className="text-zinc-600">Display currency</dt><dd className="mt-1">{user.preferredCurrency}</dd></div>
            <div><dt className="text-zinc-600">Condition pricing</dt><dd className="mt-1">Unadjusted</dd></div>
          </dl>
          <p className="mt-6 border-t border-white/8 pt-5 text-xs leading-5 text-zinc-500">
            Currency conversion is intentionally unavailable until a real exchange-rate provider is configured. Marketplace prices are preserved in their native currency. Card images are loaded from cards.scryfall.io.
          </p>
        </section>

        <section className="panel mt-8 p-6">
          <h2 className="font-medium text-rose-200">Delete account</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            This permanently removes your profile, sessions, and inventory. Stripe may keep invoices for a canceled subscription.
          </p>
          <div className="mt-5">
            <DeleteAccountForm />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
