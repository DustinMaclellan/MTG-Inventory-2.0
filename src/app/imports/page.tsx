import { AppShell } from "@/components/app-shell";
import { ImportForm } from "@/components/import-form";
import { requireEntitlement } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExportPicker } from "./export-picker";

export const metadata = { title: "Import & export" };

export default async function ImportsPage() {
  const user = await requireEntitlement();

  const [locationCounts, decks] = await Promise.all([
    db.inventoryItem.groupBy({
      by: ["storageLocation"],
      where: { collection: { userId: user.id } },
      _sum: { quantity: true },
    }),
    db.deck.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, _count: { select: { cards: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const binders = locationCounts
    .map((row) => ({
      name: row.storageLocation?.trim() || "Unassigned",
      cardCount: row._sum.quantity ?? 0,
    }))
    .sort((a, b) => {
      if (a.name === "Unassigned") return 1;
      if (b.name === "Unassigned") return -1;
      return a.name.localeCompare(b.name);
    });

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">Safe bulk operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Import & export</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Add lots from a spreadsheet, or download a CSV of what you already have.
          </p>
        </header>

        <div className="space-y-10">
          <section>
            <h2 className="text-lg font-semibold tracking-tight">Import</h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">
              Paste a CSV of exact printings. Nothing is added until every row matches the catalog.
            </p>
            <ImportForm />
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight">Export</h2>
            <p className="mt-1 mb-5 text-sm text-zinc-500">
              Download your full collection, one binder, or one deck as a CSV file.
            </p>
            <ExportPicker
              collectionCount={binders.reduce((sum, binder) => sum + binder.cardCount, 0)}
              binders={binders}
              decks={decks.map((deck) => ({
                id: deck.id,
                name: deck.name,
                cardCount: deck._count.cards,
              }))}
            />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
