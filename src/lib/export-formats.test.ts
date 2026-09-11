import { describe, expect, it } from "vitest";
import { serializeExport, type ExportRow } from "./export-formats";

const bolt: ExportRow = {
  name: "Lightning Bolt",
  setName: "Magic 2010",
  setCode: "M10",
  collectorNumber: "146",
  quantity: 4,
  condition: "LIGHTLY_PLAYED",
  finish: "FOIL",
  language: "en",
  purchasePrice: "1.25",
  marketPrice: "2.00",
  currentValue: "8.00",
  storageLocation: "Binder A",
  purchaseDate: "2026-09-01",
  notes: null,
  scryfallId: "e3285e6e-3f4b-4e4c-8c8a-aaaaaaaaaaaa",
  tcgplayerId: 12345,
  rarity: "common",
  commander: false,
  updatedAt: "2026-09-10",
};

const commander: ExportRow = {
  ...bolt,
  name: "Atraxa, Praetors' Voice",
  setName: "Commander 2016",
  setCode: "C16",
  collectorNumber: "28",
  quantity: 1,
  finish: "NONFOIL",
  commander: true,
  storageLocation: null,
};

describe("serializeExport", () => {
  it("writes a Moxfield collection CSV", () => {
    const file = serializeExport("moxfield", [bolt]);
    expect(file.extension).toBe("csv");
    expect(file.body.split("\r\n")[0]).toBe(
      "Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price",
    );
    expect(file.body).toContain("4,,Lightning Bolt,m10,Lightly Played,English,foil,Binder A,2026-09-10,146,,,1.25");
  });

  it("writes an Arena / Moxfield list with a commander section", () => {
    const file = serializeExport("arena", [bolt, commander]);
    expect(file.extension).toBe("txt");
    expect(file.body).toBe(
      [
        "4 Lightning Bolt (M10) 146 *F*",
        "",
        "Commander",
        "1 Atraxa, Praetors' Voice (C16) 28",
      ].join("\n"),
    );
  });

  it("keeps the native Mystic Ledger CSV headers for re-import", () => {
    const file = serializeExport("mystic-ledger", [bolt]);
    expect(file.body.startsWith("card_name,set_name,set_code,collector_number,quantity,")).toBe(true);
    expect(file.body).toContain("Lightning Bolt,Magic 2010,M10,146,4,LIGHTLY_PLAYED,FOIL,en,1.25");
  });
});
