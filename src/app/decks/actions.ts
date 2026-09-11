"use server";

import { Condition, Finish } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMessages, interpolate } from "@/i18n";
import { getRequestLocale } from "@/i18n/request";
import { requireEntitlement } from "@/lib/auth";
import { db } from "@/lib/db";
import { planSetCommander, type CommanderPlan } from "@/lib/deck-commander";
import { deckFormatAllowsCommander } from "@/lib/deck-formats";
import { coerceFinish } from "@/lib/finish";
import { scryfall } from "@/services/scryfall";

export type DeckFormState = { error?: string; notice?: string };

async function t() {
  return getMessages(await getRequestLocale());
}

async function applyCommanderPlan(deckId: string, plan: CommanderPlan) {
  if (plan.updates.length === 0 && plan.deletes.length === 0 && plan.creates.length === 0) {
    return;
  }

  await db.$transaction(async (tx) => {
    for (const update of plan.updates) {
      await tx.deckCard.update({
        where: { id: update.id },
        data: {
          ...(update.quantity !== undefined ? { quantity: update.quantity } : {}),
          ...(update.isCommanderZone !== undefined
            ? { isCommanderZone: update.isCommanderZone }
            : {}),
        },
      });
    }
    if (plan.deletes.length > 0) {
      await tx.deckCard.deleteMany({ where: { id: { in: plan.deletes } } });
    }
    for (const create of plan.creates) {
      await tx.deckCard.create({
        data: {
          deckId,
          cardId: create.cardId,
          cardPrintingId: create.cardPrintingId,
          finish: create.finish as Finish,
          quantity: create.quantity,
          isCommanderZone: create.isCommanderZone,
        },
      });
    }
  });
}

const deckSchema = z.object({
  name: z.string().trim().min(1).max(80),
  format: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function createDeckAction(
  _: DeckFormState,
  formData: FormData,
): Promise<DeckFormState> {
  const user = await requireEntitlement();
  const parsed = deckSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: (await t()).decks.invalidDeck };

  const deck = await db.deck.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      format: parsed.data.format || null,
      notes: parsed.data.notes || null,
    },
  });
  redirect(`/decks/${deck.id}`);
}

export async function deleteDeckAction(formData: FormData): Promise<void> {
  const user = await requireEntitlement();
  const deckId = z.string().cuid().parse(formData.get("deckId"));
  await db.deck.deleteMany({ where: { id: deckId, userId: user.id } });
  revalidatePath("/decks");
  redirect("/decks");
}

const deckCardSchema = z.object({
  deckId: z.string().cuid(),
  cardId: z.string().cuid(),
  printingId: z.string().cuid().optional(),
  finish: z.enum(Finish).default(Finish.NONFOIL),
  quantity: z.coerce.number().int().min(1).max(99),
  isCommanderZone: z.preprocess((v) => v === "true", z.boolean()),
});

export async function addDeckCardAction(
  _: DeckFormState,
  formData: FormData,
): Promise<DeckFormState> {
  const user = await requireEntitlement();
  const parsed = deckCardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid card or quantity." };

  const deck = await db.deck.findFirst({
    where: { id: parsed.data.deckId, userId: user.id },
  });
  if (!deck) return { error: "Deck not found." };

  const { deckId, cardId, printingId } = parsed.data;
  let finish = parsed.data.finish;
  const asCommander = deckFormatAllowsCommander(deck.format) && parsed.data.isCommanderZone;
  const quantity = asCommander ? 1 : parsed.data.quantity;

  if (printingId) {
    const printing = await db.cardPrinting.findUnique({
      where: { id: printingId },
      select: { finishes: true },
    });
    if (!printing) return { error: "Invalid card or quantity." };
    if (printing.finishes.length > 0 && !printing.finishes.includes(finish)) {
      return { error: (await t()).decks.finishUnavailable };
    }
  }

  const existing = printingId
    ? await db.deckCard.findFirst({
        where: { deckId, cardPrintingId: printingId, finish, isCommanderZone: asCommander },
      })
    : await db.deckCard.findFirst({
        where: { deckId, cardId, cardPrintingId: null, finish, isCommanderZone: asCommander },
      });

  if (existing) {
    await db.deckCard.update({
      where: { id: existing.id },
      data: { quantity: Math.min(99, existing.quantity + quantity) },
    });
  } else {
    await db.deckCard.create({
      data: {
        deckId,
        cardId,
        cardPrintingId: printingId ?? null,
        finish,
        quantity,
        isCommanderZone: asCommander,
      },
    });
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  return {};
}

export async function removeDeckCardAction(formData: FormData): Promise<void> {
  const user = await requireEntitlement();
  const deckCardId = z.string().cuid().parse(formData.get("deckCardId"));
  const deckId = z.string().cuid().parse(formData.get("deckId"));

  const deck = await db.deck.findFirst({ where: { id: deckId, userId: user.id } });
  if (!deck) return;

  await db.deckCard.delete({ where: { id: deckCardId } });
  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
}

export async function updateDeckAction(
  _: DeckFormState,
  formData: FormData,
): Promise<DeckFormState> {
  const user = await requireEntitlement();
  const parsed = deckSchema
    .extend({ deckId: z.string().cuid() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: (await t()).decks.invalidDeck };

  const format = parsed.data.format || null;
  const result = await db.deck.updateMany({
    where: { id: parsed.data.deckId, userId: user.id },
    data: {
      name: parsed.data.name,
      format,
      notes: parsed.data.notes || null,
    },
  });
  if (result.count === 0) return { error: (await t()).decks.invalidDeck };

  if (!deckFormatAllowsCommander(format)) {
    const cards = await db.deckCard.findMany({
      where: { deckId: parsed.data.deckId },
      select: {
        id: true,
        cardId: true,
        cardPrintingId: true,
        finish: true,
        quantity: true,
        isCommanderZone: true,
      },
    });
    await applyCommanderPlan(parsed.data.deckId, planSetCommander(cards, null));
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${parsed.data.deckId}`);
  return { notice: (await t()).decks.deckSaved };
}

export async function updateDeckCardAction(formData: FormData) {
  const user = await requireEntitlement();
  const parsed = z
    .object({
      deckId: z.string().cuid(),
      deckCardId: z.string().cuid(),
      quantity: z.coerce.number().int().min(1).max(99).optional(),
      isCommanderZone: z.enum(["true", "false"]).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const deck = await db.deck.findFirst({
    where: { id: parsed.data.deckId, userId: user.id },
    select: { id: true, format: true },
  });
  if (!deck) return;

  const allowsCommander = deckFormatAllowsCommander(deck.format);
  const data: { quantity?: number; isCommanderZone?: boolean } = {};
  if (parsed.data.isCommanderZone !== undefined) {
    if (!allowsCommander) return;
    const cards = await db.deckCard.findMany({
      where: { deckId: deck.id },
      select: {
        id: true,
        cardId: true,
        cardPrintingId: true,
        finish: true,
        quantity: true,
        isCommanderZone: true,
      },
    });
    const selectedId = parsed.data.isCommanderZone === "true" ? parsed.data.deckCardId : null;
    await applyCommanderPlan(deck.id, planSetCommander(cards, selectedId));
    revalidatePath("/decks");
    revalidatePath(`/decks/${deck.id}`);
    return;
  }
  if (parsed.data.quantity !== undefined) {
    data.quantity = parsed.data.quantity;
  }
  if (Object.keys(data).length === 0) return;

  if (data.quantity !== undefined) {
    const row = await db.deckCard.findFirst({
      where: { id: parsed.data.deckCardId, deckId: deck.id },
      select: { isCommanderZone: true },
    });
    if (row?.isCommanderZone) data.quantity = 1;
  }

  await db.deckCard.updateMany({
    where: { id: parsed.data.deckCardId, deckId: deck.id },
    data,
  });
  revalidatePath("/decks");
  revalidatePath(`/decks/${deck.id}`);
}

export async function setDeckCommanderAction(formData: FormData) {
  const user = await requireEntitlement();
  const parsed = z
    .object({
      deckId: z.string().cuid(),
      deckCardId: z.union([z.literal(""), z.string().cuid()]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const deck = await db.deck.findFirst({
    where: { id: parsed.data.deckId, userId: user.id },
    select: { id: true, format: true },
  });
  if (!deck || !deckFormatAllowsCommander(deck.format)) return;

  const cards = await db.deckCard.findMany({
    where: { deckId: deck.id },
    select: {
      id: true,
      cardId: true,
      cardPrintingId: true,
      finish: true,
      quantity: true,
      isCommanderZone: true,
    },
  });
  await applyCommanderPlan(deck.id, planSetCommander(cards, parsed.data.deckCardId || null));

  revalidatePath("/decks");
  revalidatePath(`/decks/${deck.id}`);
}

export async function addAllMissingToCollectionAction(
  _: DeckFormState,
  formData: FormData,
): Promise<DeckFormState> {
  const user = await requireEntitlement();
  const m = await t();
  const parsed = z.object({ deckId: z.string().cuid() }).safeParse({ deckId: formData.get("deckId") });
  if (!parsed.success) return { error: m.decks.invalidDeck };

  const deck = await db.deck.findFirst({
    where: { id: parsed.data.deckId, userId: user.id },
    include: {
      cards: { include: { printing: { select: { id: true, finishes: true, scryfallId: true } } } },
    },
  });
  if (!deck) return { error: m.decks.invalidDeck };

  const collection = await db.collection.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!collection) return { error: m.decks.invalidDeck };

  const printingIds = deck.cards.map((row) => row.cardPrintingId).filter(Boolean) as string[];
  const ownedRows =
    printingIds.length === 0
      ? []
      : await db.inventoryItem.groupBy({
          by: ["cardPrintingId", "finish"],
          where: { collectionId: collection.id, cardPrintingId: { in: printingIds } },
          _sum: { quantity: true },
        });
  const ownedByPrintingFinish = new Map(
    ownedRows.map((row) => [`${row.cardPrintingId}:${row.finish}`, row._sum.quantity ?? 0]),
  );

  let added = 0;
  const addedScryfallIds: string[] = [];
  const neededByPrintingFinish = new Map<
    string,
    { cardPrintingId: string; finish: Finish; printing: NonNullable<(typeof deck.cards)[number]["printing"]>; quantity: number }
  >();
  for (const row of deck.cards) {
    if (!row.cardPrintingId || !row.printing) continue;
    const finish = coerceFinish(row.finish, row.printing.finishes);
    const key = `${row.cardPrintingId}:${finish}`;
    const current = neededByPrintingFinish.get(key);
    if (current) current.quantity += row.quantity;
    else {
      neededByPrintingFinish.set(key, {
        cardPrintingId: row.cardPrintingId,
        finish,
        printing: row.printing,
        quantity: row.quantity,
      });
    }
  }
  for (const item of neededByPrintingFinish.values()) {
    const ownedKey = `${item.cardPrintingId}:${item.finish}`;
    const needed = Math.max(0, item.quantity - (ownedByPrintingFinish.get(ownedKey) ?? 0));
    if (needed === 0) continue;
    await db.inventoryItem.create({
      data: {
        collectionId: collection.id,
        cardPrintingId: item.cardPrintingId,
        quantity: needed,
        condition: Condition.NEAR_MINT,
        finish: item.finish,
        purchaseCurrency: user.preferredCurrency,
      },
    });
    ownedByPrintingFinish.set(ownedKey, (ownedByPrintingFinish.get(ownedKey) ?? 0) + needed);
    added += needed;
    addedScryfallIds.push(item.printing.scryfallId);
  }

  if (addedScryfallIds.length > 0) {
    try {
      const cards = await scryfall.getPrintingsByIds([...new Set(addedScryfallIds)]);
      await scryfall.synchronizePrintings(cards);
    } catch {
      // Lots are already created; collection can still fall back to stored JSON prices.
    }
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deck.id}`);
  revalidatePath("/collection");
  revalidatePath("/dashboard");
  revalidatePath("/storage");
  return { notice: interpolate(m.decks.addedMissing, { count: added }) };
}
