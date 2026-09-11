import { describe, expect, it } from "vitest";
import { deckFormatAllowsCommander } from "./deck-formats";

describe("deckFormatAllowsCommander", () => {
  it("allows Commander / EDH only", () => {
    expect(deckFormatAllowsCommander("commander")).toBe(true);
  });

  it("rejects constructed, limited, and unset formats", () => {
    expect(deckFormatAllowsCommander("standard")).toBe(false);
    expect(deckFormatAllowsCommander("modern")).toBe(false);
    expect(deckFormatAllowsCommander("legacy")).toBe(false);
    expect(deckFormatAllowsCommander("vintage")).toBe(false);
    expect(deckFormatAllowsCommander("pioneer")).toBe(false);
    expect(deckFormatAllowsCommander("pauper")).toBe(false);
    expect(deckFormatAllowsCommander("draft")).toBe(false);
    expect(deckFormatAllowsCommander(null)).toBe(false);
    expect(deckFormatAllowsCommander(undefined)).toBe(false);
    expect(deckFormatAllowsCommander("")).toBe(false);
  });
});
