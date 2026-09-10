import { describe, expect, it } from "vitest";
import { availableFinishes, coerceFinish, pickFinish } from "./finish";

describe("coerceFinish", () => {
  it("keeps a finish the printing actually has", () => {
    expect(coerceFinish("NONFOIL", ["NONFOIL", "FOIL"])).toBe("NONFOIL");
    expect(coerceFinish("FOIL", ["NONFOIL", "FOIL"])).toBe("FOIL");
  });

  it("uses the printing's only finish when the paste said something else", () => {
    expect(coerceFinish("NONFOIL", ["FOIL"])).toBe("FOIL");
    expect(coerceFinish("FOIL", ["ETCHED"])).toBe("ETCHED");
  });

  it("leaves the requested finish alone when the catalog has none listed", () => {
    expect(coerceFinish("NONFOIL", [])).toBe("NONFOIL");
  });
});

describe("pickFinish", () => {
  it("prefers the requested finish when it is available", () => {
    expect(pickFinish(["NONFOIL", "FOIL"], "FOIL")).toBe("FOIL");
  });

  it("falls back to the first available finish", () => {
    expect(pickFinish(["FOIL"], "NONFOIL")).toBe("FOIL");
  });
});

describe("availableFinishes", () => {
  it("locks to a finish written on the list line", () => {
    expect(availableFinishes(["NONFOIL", "FOIL"], "FOIL", true)).toEqual(["FOIL"]);
  });

  it("uses the printing's finishes when the line did not specify one", () => {
    expect(availableFinishes(["FOIL"], "NONFOIL", false)).toEqual(["FOIL"]);
    expect(availableFinishes(["NONFOIL", "FOIL"], "NONFOIL", false)).toEqual(["NONFOIL", "FOIL"]);
  });
});
