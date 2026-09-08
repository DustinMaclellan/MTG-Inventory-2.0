import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <AppShell userName={user.displayName}>
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <section className="panel mt-8 p-6">
          <h2 className="font-medium">Pricing preferences</h2>
          <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
            <div><dt className="text-zinc-600">Provider</dt><dd className="mt-1">Scryfall</dd></div>
            <div><dt className="text-zinc-600">Metric</dt><dd className="mt-1">Market</dd></div>
            <div><dt className="text-zinc-600">Display currency</dt><dd className="mt-1">{user.preferredCurrency}</dd></div>
            <div><dt className="text-zinc-600">Condition pricing</dt><dd className="mt-1">Unadjusted</dd></div>
          </dl>
          <p className="mt-6 border-t border-white/8 pt-5 text-xs leading-5 text-zinc-500">
            Currency conversion is intentionally unavailable until a real exchange-rate provider is configured. Marketplace prices are preserved in their native currency.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
