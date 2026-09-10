import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ImportForm } from "@/components/import-form";
import { requireEntitlement } from "@/lib/auth";

export const metadata = { title: "Import & export" };

export default async function ImportsPage() {
  const user = await requireEntitlement();
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm text-emerald-400">Safe bulk operations</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Import & export</h1>
            <p className="mt-2 text-sm text-zinc-500">Exact printing matches are required. Unresolved rows are never silently imported.</p>
          </div>
          <a href="/api/export" className="panel flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300">
            <Download size={17} /> Export collection
          </a>
        </header>
        <ImportForm />
      </div>
    </AppShell>
  );
}
