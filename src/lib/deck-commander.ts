export type DeckCardSnapshot = {
  id: string;
  cardId: string;
  cardPrintingId: string | null;
  finish: string;
  quantity: number;
  isCommanderZone: boolean;
};

export type CommanderPlan = {
  updates: Array<{ id: string; quantity?: number; isCommanderZone?: boolean }>;
  deletes: string[];
  creates: Array<{
    cardId: string;
    cardPrintingId: string | null;
    finish: string;
    quantity: number;
    isCommanderZone: boolean;
  }>;
};

export function deckCardIdentityKey(
  row: Pick<DeckCardSnapshot, "cardPrintingId" | "cardId" | "finish">,
) {
  return `${row.cardPrintingId ?? `card:${row.cardId}`}:${row.finish}`;
}

export function uniqueCommanderPickerCards<T extends {
  id: string;
  cardId: string;
  cardPrintingId: string | null;
  finish: string;
}>(cards: T[], commanderId: string | null): T[] {
  const seen = new Set<string>();
  const ordered = [...cards].sort((a, b) => {
    if (a.id === commanderId) return -1;
    if (b.id === commanderId) return 1;
    return 0;
  });
  const unique: T[] = [];
  for (const card of ordered) {
    const key = deckCardIdentityKey(card);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(card);
  }
  return unique;
}

export function planSetCommander(
  cards: DeckCardSnapshot[],
  selectedId: string | null,
): CommanderPlan {
  const updates: CommanderPlan["updates"] = [];
  const deletes: string[] = [];
  const creates: CommanderPlan["creates"] = [];

  if (selectedId && !cards.some((card) => card.id === selectedId)) {
    return { updates, deletes, creates };
  }

  const currentCommander = cards.find((card) => card.isCommanderZone);
  if (selectedId && currentCommander?.id === selectedId) {
    return { updates, deletes, creates };
  }

  const working = cards.map((card) => ({ ...card }));

  function recordUpdate(id: string, patch: { quantity?: number; isCommanderZone?: boolean }) {
    const existing = updates.find((item) => item.id === id);
    if (existing) Object.assign(existing, patch);
    else updates.push({ id, ...patch });
  }

  for (const commander of working.filter((card) => card.isCommanderZone)) {
    const mainboard = working.find(
      (card) => !card.isCommanderZone && deckCardIdentityKey(card) === deckCardIdentityKey(commander),
    );
    if (mainboard) {
      mainboard.quantity += commander.quantity;
      recordUpdate(mainboard.id, { quantity: mainboard.quantity });
      working.splice(working.indexOf(commander), 1);
      deletes.push(commander.id);
    } else {
      commander.isCommanderZone = false;
      recordUpdate(commander.id, { isCommanderZone: false });
    }
  }

  if (!selectedId) {
    return {
      updates: updates.filter((item) => !deletes.includes(item.id)),
      deletes,
      creates,
    };
  }

  const original = cards.find((card) => card.id === selectedId);
  if (!original) {
    return { updates, deletes, creates };
  }

  const source =
    working.find((card) => card.id === selectedId) ??
    working.find(
      (card) => deckCardIdentityKey(card) === deckCardIdentityKey(original) && !card.isCommanderZone,
    );
  if (!source) {
    return {
      updates: updates.filter((item) => !deletes.includes(item.id)),
      deletes,
      creates,
    };
  }

  if (source.quantity > 1) {
    source.quantity -= 1;
    recordUpdate(source.id, { quantity: source.quantity });
    creates.push({
      cardId: source.cardId,
      cardPrintingId: source.cardPrintingId,
      finish: source.finish,
      quantity: 1,
      isCommanderZone: true,
    });
  } else {
    source.isCommanderZone = true;
    recordUpdate(source.id, { isCommanderZone: true, quantity: 1 });
  }

  return {
    updates: updates.filter((item) => !deletes.includes(item.id)),
    deletes,
    creates,
  };
}

export function deckOwnedTotals(
  rows: Array<{ cardPrintingId: string | null; finish: string; quantity: number }>,
  ownedByPrintingFinish: Map<string, number>,
) {
  const totalCards = rows.reduce((sum, row) => sum + row.quantity, 0);
  const needed = new Map<string, number>();
  for (const row of rows) {
    if (!row.cardPrintingId) continue;
    const key = `${row.cardPrintingId}:${row.finish}`;
    needed.set(key, (needed.get(key) ?? 0) + row.quantity);
  }
  let ownedCards = 0;
  for (const [key, qty] of needed) {
    ownedCards += Math.min(ownedByPrintingFinish.get(key) ?? 0, qty);
  }
  return { totalCards, ownedCards, missingCards: totalCards - ownedCards };
}

export function allocateRowOwnership<
  T extends {
    id: string;
    cardPrintingId: string | null;
    finish: string;
    quantity: number;
    isCommanderZone: boolean;
  },
>(rows: T[], ownedByPrintingFinish: Map<string, number>) {
  const remaining = new Map(ownedByPrintingFinish);
  const ordered = [...rows].sort(
    (a, b) => Number(b.isCommanderZone) - Number(a.isCommanderZone),
  );
  const byId = new Map<
    string,
    { ownedQty: number; fullyOwned: boolean; partial: boolean; missing: boolean }
  >();
  for (const row of ordered) {
    const key = row.cardPrintingId ? `${row.cardPrintingId}:${row.finish}` : null;
    const available = key ? remaining.get(key) ?? 0 : 0;
    const used = Math.min(available, row.quantity);
    if (key) remaining.set(key, available - used);
    byId.set(row.id, {
      ownedQty: used,
      fullyOwned: used >= row.quantity,
      partial: used > 0 && used < row.quantity,
      missing: used === 0,
    });
  }
  return byId;
}
