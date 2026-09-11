import { describe, expect, it } from "vitest";
import { Condition, Finish } from "@prisma/client";
import { serializeExport, type ExportRow } from "../lib/export-formats";
import { parseInventoryCsv } from "./csv";

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

describe("parseInventoryCsv", () => {
  it("normalizes supported inventory fields", () => {
    const result = parseInventoryCsv(
      "card_name,set_code,collector_number,quantity,condition,finish,language,purchase_price\nLightning Bolt,M11,146,4,LP,foil,en,2.25",
    );
    expect(result.invalid).toEqual([]);
    expect(result.valid[0]).toMatchObject({
      cardName: "Lightning Bolt",
      setCode: "m11",
      collectorNumber: "146",
      quantity: 4,
      condition: Condition.LIGHTLY_PLAYED,
      finish: Finish.FOIL,
      purchasePrice: 2.25,
    });
  });

  it("reports malformed rows rather than silently accepting them", () => {
    const result = parseInventoryCsv(
      "card_name,set_code,collector_number,quantity,condition,finish\nSol Ring,CMM,396,nope,NM,nonfoil",
    );
    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.row).toBe(2);
    expect(result.invalid[0]?.reason).toBe("quantity");
  });

  it("reports an empty card name as invalid", () => {
    const result = parseInventoryCsv("card_name,quantity\n,4");
    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0]?.reason).toBe("emptyName");
  });

  it.each(["moxfield", "archidekt", "manabox", "deckbox", "tcgplayer", "mtggoldfish", "mystic-ledger"] as const)(
    "reads a %s export",
    (format) => {
      const result = parseInventoryCsv(serializeExport(format, [bolt]).body);
      expect(result.invalid).toEqual([]);
      expect(result.valid[0]).toMatchObject({
        cardName: "Lightning Bolt",
        quantity: 4,
        finish: Finish.FOIL,
      });
    },
  );
});
