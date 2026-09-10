import Link from "next/link";
import { Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CheckoutForm } from "@/components/checkout-form";
import { requireUser } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/constants";
import { hasEntitlement, trialDaysRemaining } from "@/lib/entitlements";

export const metadata = { title: "Subscribe" };

const planFeatures = [
  "Exact Scryfall printings — set, finish, and condition",
  "Live portfolio value and unrealized gain",
  "Storage location tracking and full-text search",
  "CSV import with preview, export at any time",
  "Private to your account",
];

export default async function SubscribePage() {
  const user = await requireUser();
  const entitled = hasEntitlement(user);
  const daysLeft = trialDaysRemaining(user);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-2">
            Mystic Ledger Pro
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {entitled
              ? "Upgrade whenever you\u2019re ready"
              : "Your trial has ended"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {entitled && daysLeft !== null
              ? `You have ${daysLeft} day${daysLeft === 1 ? "" : "s"} of free access remaining. Subscribe now to keep your ledger going after the trial.`
              : entitled
              ? "You already have an active subscription. You can change plans below or manage billing in Settings."
              : `Your ${TRIAL_DAYS}-day trial is over. Subscribe to re-open your collection, add cards, and export.`}
          </p>
        </div>

        {/* Feature list */}
        <div className="panel mb-8 p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            What you\u2019re getting
          </p>
          <ul className="space-y-2.5">
            {planFeatures.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
                <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <CheckoutForm />

        <p className="mt-6 text-center text-sm text-zinc-600">
          Already subscribed?{" "}
          <Link href="/settings" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            Manage billing in Settings
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
