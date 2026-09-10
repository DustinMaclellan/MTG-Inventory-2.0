import { refreshOwnedPrices } from "../src/services/price-sync";
import { syncCatalog } from "../src/services/catalog-sync";

async function main() {
  const catalog = await syncCatalog({ bulk: true });
  console.log(
    catalog.source === "bulk"
      ? `Imported Scryfall bulk catalog (${catalog.printingCount} paper printings)`
      : `Synchronized ${catalog.synchronized} newest printings across ${catalog.pages} page(s)`,
  );

  const prices = await refreshOwnedPrices();
  console.log(
    `Refreshed prices for ${prices.synchronized} of ${prices.printings} owned printing(s)`,
  );
}

void main();
