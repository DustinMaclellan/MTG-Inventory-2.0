import { describe, expect, it } from "vitest";
import { parseCatalogQuery, restoreRejectedSet, scryfallCatalogQuery } from "./catalog-query";

describe("parseCatalogQuery", () => {
  it("keeps multi-word names that are not a set code", () => {
    expect(parseCatalogQuery("Lightning Greaves")).toEqual({ name: "Lightning Greaves" });
  });

  it("reads a name plus collector number", () => {
    expect(parseCatalogQuery("Plains 310")).toEqual({
      name: "Plains",
      collectorNumber: "310",
    });
    expect(parseCatalogQuery("Plains #310")).toEqual({
      name: "Plains",
      collectorNumber: "310",
    });
  });

  it("reads a name plus set code as a candidate set", () => {
    expect(parseCatalogQuery("Plains CMM")).toEqual({
      name: "Plains",
      setCode: "CMM",
    });
    expect(parseCatalogQuery("Sol Ring CMM 410")).toEqual({
      name: "Sol Ring",
      setCode: "CMM",
      collectorNumber: "410",
    });
    expect(parseCatalogQuery("sol ring mh3 310")).toEqual({
      name: "sol ring",
      setCode: "mh3",
      collectorNumber: "310",
    });
    expect(parseCatalogQuery("Sol Ring")).toEqual({ name: "Sol", setCode: "Ring" });
    expect(restoreRejectedSet({ name: "Sol", setCode: "Ring" })).toEqual({ name: "Sol Ring" });
    expect(
      restoreRejectedSet({ name: "Mana", setCode: "Crypt", collectorNumber: "17a" }),
    ).toEqual({ name: "Mana Crypt", collectorNumber: "17a" });
  });

  it("reads Arena-style name (SET) number", () => {
    expect(parseCatalogQuery("Sol Ring (CMM) 410")).toEqual({
      name: "Sol Ring",
      setCode: "CMM",
      collectorNumber: "410",
    });
  });

  it("still accepts set: and cn: operators", () => {
    expect(parseCatalogQuery("set:cmm cn:410")).toEqual({
      name: "",
      setCode: "cmm",
      collectorNumber: "410",
    });
  });

  it("treats a lone set code or number as before", () => {
    expect(parseCatalogQuery("CMM")).toEqual({ name: "", setCode: "CMM" });
    expect(parseCatalogQuery("161")).toEqual({ name: "", collectorNumber: "161" });
  });

  it("glues a rejected set token back onto the name", () => {
    expect(restoreRejectedSet({ name: "The One", setCode: "Ring" })).toEqual({
      name: "The One Ring",
    });
  });

  it("reads a full set name, including a missing plural", () => {
    const sets = [
      { code: "mh3", name: "Modern Horizons 3" },
      { code: "cmm", name: "Commander Masters" },
      { code: "mh1", name: "Modern Horizons" },
    ];
    expect(parseCatalogQuery("Plains Modern Horizons 3", sets)).toEqual({
      name: "Plains",
      setCode: "mh3",
    });
    expect(parseCatalogQuery("plains modern horizon 3 310", sets)).toEqual({
      name: "plains",
      setCode: "mh3",
      collectorNumber: "310",
    });
    expect(parseCatalogQuery("sol ring commander masters 410", sets)).toEqual({
      name: "sol ring",
      setCode: "cmm",
      collectorNumber: "410",
    });
  });

  it("builds a Scryfall query from parts", () => {
    expect(scryfallCatalogQuery({ name: "Plains", collectorNumber: "310" })).toBe(
      '!"Plains" game:paper cn:310',
    );
    expect(scryfallCatalogQuery({ name: "Sol Ring", setCode: "cmm" })).toBe(
      '!"Sol Ring" game:paper set:cmm',
    );
  });
});
