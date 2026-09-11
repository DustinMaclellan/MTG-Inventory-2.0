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
      { cardName: "Mana Crypt", quantity: 4, finish: "FOIL", finishSpecified: true },
      { cardName: "Sol Ring", setCode: "cmm", collectorNumber: "410", finish: "FOIL", finishSpecified: true },
      { cardName: "Rhystic Study", finish: "ETCHED", finishSpecified: true },
      { cardName: "Lightning Bolt", finish: "NONFOIL", finishSpecified: true },
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

  it("keeps lettered collector numbers like Special Guests neon ink", () => {
    const result = parseDecklist("1 Mana Crypt (SPG) 17a");
    expect(result.valid[0]).toMatchObject({
      cardName: "Mana Crypt",
      setCode: "spg",
      collectorNumber: "17a",
      finish: "NONFOIL",
    });
  });

  it("keeps a fake name as a valid row so catalog matching can mark it unresolved", () => {
    const result = parseDecklist("XXXXX");
    expect(result.invalid).toEqual([]);
    expect(result.valid).toMatchObject([{ cardName: "XXXXX", quantity: 1 }]);
  });

  it("marks a zero quantity as invalid, not unresolved", () => {
    const result = parseDecklist("0 Lightning Bolt");
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([{ row: 1, reason: "quantity", line: "0 Lightning Bolt" }]);
  });

  it("marks punctuation-only lines as invalid", () => {
    const result = parseDecklist("????");
    expect(result.valid).toEqual([]);
    expect(result.invalid[0]).toMatchObject({ reason: "unreadable", line: "????" });
  });

  it("keeps name-only and set-only lines for later printing choice", () => {
    const result = parseDecklist(`Mana Crypt
1 Rhystic Study (PCY)`);
    expect(result.valid[0]).toMatchObject({ cardName: "Mana Crypt", setCode: "", collectorNumber: "", quantity: 1, finishSpecified: false });
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
