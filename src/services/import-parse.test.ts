import { describe, expect, it } from "vitest";
import { parseDecklist, parseImportPaste } from "./import-parse";

describe("parseDecklist", () => {
  it("reads Arena lines with set and collector number", () => {
    const result = parseDecklist(`Deck
4 Mana Crypt (2XM) 11
1 Sol Ring (CMM) 410`);
    expect(result.invalid).toEqual([]);
    expect(result.valid).toMatchObject([
      { cardName: "Mana Crypt", setCode: "2xm", collectorNumber: "11", quantity: 4 },
      { cardName: "Sol Ring", setCode: "cmm", collectorNumber: "410", quantity: 1 },
    ]);
  });

  it("reads finish from the end of a line", () => {
    const result = parseDecklist(`4 Mana Crypt foil
1 Sol Ring (CMM) 410 *F*
1 Rhystic Study (etched)
1 Lightning Bolt nonfoil`);
    expect(result.invalid).toEqual([]);
    expect(result.valid).toMatchObject([
      { cardName: "Mana Crypt", quantity: 4, finish: "FOIL" },
      { cardName: "Sol Ring", setCode: "cmm", collectorNumber: "410", finish: "FOIL" },
      { cardName: "Rhystic Study", finish: "ETCHED" },
      { cardName: "Lightning Bolt", finish: "NONFOIL" },
    ]);
  });

  it("skips separators, lone counts, foil markers, and section headers", () => {
    const result = parseDecklist(`About
Deck
---
14
4 Mana Crypt *F*
1 Sol Ring (foil)
Lands
4x
https://example.com/deck`);
    expect(result.invalid).toEqual([]);
    expect(result.valid).toMatchObject([
      { cardName: "Mana Crypt", quantity: 4, finish: "FOIL" },
      { cardName: "Sol Ring", quantity: 1, finish: "FOIL" },
    ]);
  });

  it("keeps name-only and set-only lines for later printing choice", () => {
    const result = parseDecklist(`Mana Crypt
1 Rhystic Study (PCY)`);
    expect(result.valid[0]).toMatchObject({ cardName: "Mana Crypt", setCode: "", collectorNumber: "", quantity: 1 });
    expect(result.valid[1]).toMatchObject({ cardName: "Rhystic Study", setCode: "pcy", collectorNumber: "" });
  });
});

describe("parseImportPaste", () => {
  it("still parses a full inventory CSV", () => {
    const result = parseImportPaste(
      "card_name,set_code,collector_number,quantity\nLightning Bolt,M11,146,4",
    );
    expect(result.valid[0]).toMatchObject({
      cardName: "Lightning Bolt",
      setCode: "m11",
      collectorNumber: "146",
      quantity: 4,
    });
  });

  it("allows a CSV with only a card name", () => {
    const result = parseImportPaste("card_name,quantity\nMana Crypt,2");
    expect(result.invalid).toEqual([]);
    expect(result.valid[0]).toMatchObject({ cardName: "Mana Crypt", setCode: "", quantity: 2 });
  });
});
