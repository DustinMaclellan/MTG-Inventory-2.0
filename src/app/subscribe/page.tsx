import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CheckoutForm } from "@/components/checkout-form";
import { requireUser } from "@/lib/auth";
import { PLAN_NAME, TRIAL_DAYS } from "@/lib/constants";
import { hasEntitlement, trialDaysRemaining } from "@/lib/entitlements";

export const metadata = { title: "Subscribe" };

export default async function SubscribePage() {
  const user = await requireUser();
  const entitled = hasEntitlement(user);
  const daysLeft = trialDaysRemaining(user);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-sm text-emerald-400">{PLAN_NAME}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {entitled ? "Upgrade whenever you are ready" : "Your trial has ended"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {entitled
            ? daysLeft !== null
              ? `You still have ${daysLeft} day${daysLeft === 1 ? "" : "s"} of free access. Subscribe now to keep your ledger after the trial.`
              : "You already have access. You can still change plans through checkout or the billing portal."
            : `The ${TRIAL_DAYS}-day trial is over. Subscribe to open your collection, add cards, and export again.`}
        </p>
        <div className="mt-8">
          <CheckoutForm />
        </div>
        <p className="mt-6 text-sm text-zinc-600">
          Already subscribed?{" "}
          <Link href="/settings" className="text-emerald-400 hover:text-emerald-300">
            Manage billing in Settings
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
