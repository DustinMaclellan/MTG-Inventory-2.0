import { syncCatalog } from "../src/services/catalog-sync";

const result = await syncCatalog();
console.log(`Synchronized ${result.synchronized} printings across ${result.pages} page(s)`);
