import { refreshOwnedPrices } from "../src/services/price-sync";
import { syncCatalog } from "../src/services/catalog-sync";

const prices = await refreshOwnedPrices();
console.log(`Refreshed prices for ${prices.synchronized} of ${prices.printings} owned printing(s)`);

const catalog = await syncCatalog();
console.log(`Synchronized ${catalog.synchronized} printings across ${catalog.pages} page(s)`);
