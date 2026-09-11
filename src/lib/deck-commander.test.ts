import { describe, expect, it } from "vitest";
import {
  allocateRowOwnership,
  deckOwnedTotals,
  planSetCommander,
  uniqueCommanderPickerCards,
  type DeckCardSnapshot,
} from "./deck-commander";

function row(
  overrides: Partial<DeckCardSnapshot> & Pick<DeckCardSnapshot, "id" | "quantity" | "isCommanderZone">,
): DeckCardSnapshot {
  return {
    cardId: "card-plains",
    cardPrintingId: "print-plains",
    finish: "NONFOIL",
    ...overrides,
  };
}

describe("planSetCommander", () => {
  it("splits extra copies into the mainboard when promoting a commander", () => {
    const plan = planSetCommander(
      [row({ id: "plains", quantity: 5, isCommanderZone: false })],
      "plains",
    );

    expect(plan.deletes).toEqual([]);
    expect(plan.updates).toEqual([{ id: "plains", quantity: 4 }]);
    expect(plan.creates).toEqual([
      {
        cardId: "card-plains",
        cardPrintingId: "print-plains",
        finish: "NONFOIL",
        quantity: 1,
        isCommanderZone: true,
      },
    ]);
  });

  it("returns extra copies to the mainboard when the commander is cleared", () => {
    const plan = planSetCommander(
      [
        row({ id: "cmd", quantity: 1, isCommanderZone: true }),
        row({ id: "main", quantity: 4, isCommanderZone: false }),
      ],
      null,
    );

    expect(plan.creates).toEqual([]);
    expect(plan.deletes).toEqual(["cmd"]);
    expect(plan.updates).toEqual([{ id: "main", quantity: 5 }]);
  });

  it("flips a single copy back to the mainboard when it was the only commander", () => {
    const plan = planSetCommander(
      [row({ id: "cmd", quantity: 1, isCommanderZone: true })],
      null,
    );

    expect(plan).toEqual({
      updates: [{ id: "cmd", isCommanderZone: false }],
      deletes: [],
      creates: [],
    });
  });

  it("promotes a single copy without creating a second row", () => {
    const plan = planSetCommander(
      [row({ id: "solo", quantity: 1, isCommanderZone: false })],
      "solo",
    );

    expect(plan).toEqual({
      updates: [{ id: "solo", isCommanderZone: true, quantity: 1 }],
      deletes: [],
      creates: [],
    });
  });

  it("does nothing when the selected card is already the commander", () => {
    const plan = planSetCommander(
      [
        row({ id: "cmd", quantity: 1, isCommanderZone: true }),
        row({ id: "main", quantity: 4, isCommanderZone: false }),
      ],
      "cmd",
    );

    expect(plan).toEqual({ updates: [], deletes: [], creates: [] });
  });

  it("returns the previous commander to the mainboard when switching", () => {
    const plan = planSetCommander(
      [
        row({ id: "old-cmd", cardId: "a", cardPrintingId: "print-a", quantity: 1, isCommanderZone: true }),
        row({
          id: "new",
          cardId: "b",
          cardPrintingId: "print-b",
          quantity: 3,
          isCommanderZone: false,
        }),
      ],
      "new",
    );

    expect(plan.deletes).toEqual([]);
    expect(plan.updates).toEqual(
      expect.arrayContaining([
        { id: "old-cmd", isCommanderZone: false },
        { id: "new", quantity: 2 },
      ]),
    );
    expect(plan.creates).toEqual([
      {
        cardId: "b",
        cardPrintingId: "print-b",
        finish: "NONFOIL",
        quantity: 1,
        isCommanderZone: true,
      },
    ]);
  });
});

describe("uniqueCommanderPickerCards", () => {
  it("keeps one option when commander and mainboard share a printing", () => {
    const cards = uniqueCommanderPickerCards(
      [
        row({ id: "main", quantity: 4, isCommanderZone: false }),
        row({ id: "cmd", quantity: 1, isCommanderZone: true }),
      ],
      "cmd",
    );

    expect(cards.map((card) => card.id)).toEqual(["cmd"]);
  });
});

describe("deck ownership", () => {
  it("does not double-count owned copies split across commander and mainboard", () => {
    const owned = new Map([["print-plains:NONFOIL", 3]]);
    const rows = [
      row({ id: "cmd", quantity: 1, isCommanderZone: true }),
      row({ id: "main", quantity: 4, isCommanderZone: false }),
    ];

    expect(deckOwnedTotals(rows, owned)).toEqual({
      totalCards: 5,
      ownedCards: 3,
      missingCards: 2,
    });

    const byId = allocateRowOwnership(rows, owned);
    expect(byId.get("cmd")).toMatchObject({ ownedQty: 1, fullyOwned: true });
    expect(byId.get("main")).toMatchObject({ ownedQty: 2, partial: true });
  });
});
