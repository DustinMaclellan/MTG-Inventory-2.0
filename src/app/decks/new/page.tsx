import { AppShell } from "@/components/app-shell";
import { requireEntitlement } from "@/lib/auth";
import { NewDeckForm } from "./new-deck-form";

export const metadata = { title: "New deck" };

export default async function NewDeckPage() {
  const user = await requireEntitlement();
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-lg px-5 py-8 sm:px-8 lg:py-10">
        <div className="mb-8">
          <p className="text-sm text-emerald-400">Deck builder</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">New deck</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Give your deck a name and format. You can add cards right after.
          </p>
        </div>
        <div className="panel p-7">
          <NewDeckForm />
        </div>
      </div>
    </AppShell>
  );
}
