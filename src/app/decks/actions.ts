"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireEntitlement } from "@/lib/auth";
import { db } from "@/lib/db";

export type DeckFormState = { error?: string };

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
  if (!parsed.success) return { error: "Enter a deck name (max 80 characters)." };

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

  // Verify deck belongs to user
  const deck = await db.deck.findFirst({
    where: { id: parsed.data.deckId, userId: user.id },
  });
  if (!deck) return { error: "Deck not found." };

  const { deckId, cardId, printingId, quantity, isCommanderZone } = parsed.data;

  // Upsert by (deckId, cardPrintingId) — each printing is its own deck entry
  const existing = printingId
    ? await db.deckCard.findFirst({ where: { deckId, cardPrintingId: printingId } })
    : await db.deckCard.findFirst({ where: { deckId, cardId, cardPrintingId: null } });

  if (existing) {
    await db.deckCard.update({
      where: { id: existing.id },
      data: { quantity, isCommanderZone },
    });
  } else {
    await db.deckCard.create({
      data: { deckId, cardId, cardPrintingId: printingId ?? null, quantity, isCommanderZone },
    });
  }

  revalidatePath(`/decks/${deckId}`);
  return {};
}

export async function removeDeckCardAction(formData: FormData): Promise<void> {
  const user = await requireEntitlement();
  const deckCardId = z.string().cuid().parse(formData.get("deckCardId"));
  const deckId = z.string().cuid().parse(formData.get("deckId"));

  // Verify ownership via deck
  const deck = await db.deck.findFirst({ where: { id: deckId, userId: user.id } });
  if (!deck) return;

  await db.deckCard.delete({ where: { id: deckCardId } });
  revalidatePath(`/decks/${deckId}`);
}
