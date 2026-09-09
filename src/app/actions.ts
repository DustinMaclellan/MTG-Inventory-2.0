"use server";

import { Condition, Currency, Finish } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSession,
  deleteSession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInventoryCsv } from "@/services/csv";
import { scryfall } from "@/services/scryfall";

export type FormState = { error?: string };

const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(10).max(128),
});

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentialsSchema
    .extend({ displayName: z.string().trim().min(2).max(60) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid name, email, and 10+ character password." };

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: "An account already exists for this email." };

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: parsed.data.email,
        displayName: parsed.data.displayName,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
    await tx.collection.create({ data: { userId: created.id, name: "My Collection" } });
    return created;
  });
  await createSession(user.id);
  redirect("/");
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid email or password." };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return { error: "Invalid email or password." };
  }
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

const inventorySchema = z.object({
  cardPrintingId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(9999),
  condition: z.enum(Condition),
  finish: z.enum(Finish),
  purchasePrice: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().nonnegative().max(1_000_000).optional(),
  ),
  storageLocation: z.string().trim().max(120).optional(),
  returnQuery: z.string().trim().max(200).optional(),
});

export async function addInventoryAction(formData: FormData) {
  const user = await requireUser();
  const parsed = inventorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid inventory item");

  const [collection, printing] = await Promise.all([
    db.collection.findFirst({ where: { userId: user.id }, select: { id: true } }),
    db.cardPrinting.findUnique({
      where: { id: parsed.data.cardPrintingId },
      select: { finishes: true },
    }),
  ]);
  if (!collection || !printing) throw new Error("Collection or printing not found");
  if (!printing.finishes.includes(parsed.data.finish)) {
    throw new Error("That finish is not available for this printing");
  }

  await db.inventoryItem.create({
    data: {
      collectionId: collection.id,
      cardPrintingId: parsed.data.cardPrintingId,
      quantity: parsed.data.quantity,
      condition: parsed.data.condition,
      finish: parsed.data.finish,
      purchasePrice: parsed.data.purchasePrice,
      purchaseCurrency: Currency.USD,
      storageLocation: parsed.data.storageLocation || null,
    },
  });
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/storage");
  revalidatePath("/add");

  const params = new URLSearchParams({ added: "1" });
  if (parsed.data.returnQuery) params.set("q", parsed.data.returnQuery);
  redirect(`/add?${params.toString()}`);
}

export async function deleteInventoryAction(formData: FormData) {
  const user = await requireUser();
  const itemId = z.string().cuid().parse(formData.get("itemId"));
  await db.inventoryItem.deleteMany({
    where: { id: itemId, collection: { userId: user.id } },
  });
  revalidatePath("/");
  revalidatePath("/collection");
}

export type ImportPreviewState = {
  error?: string;
  recognized?: Array<{
    row: number;
    printingId: string;
    cardName: string;
    setCode: string;
    collectorNumber: string;
    quantity: number;
    condition: Condition;
    finish: Finish;
    language: string;
    purchasePrice?: number;
    storageLocation?: string;
  }>;
  unresolved?: Array<{ row: number; cardName: string; printing: string }>;
  invalid?: Array<{ row: number; message: string }>;
  duplicates?: number;
};

export async function previewImportAction(
  _: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  await requireUser();
  const csv = z.string().max(2_000_000).safeParse(formData.get("csv"));
  if (!csv.success) return { error: "Paste a CSV smaller than 2 MB." };
  const parsed = parseInventoryCsv(csv.data);
  const recognized: NonNullable<ImportPreviewState["recognized"]> = [];
  const unresolved: NonNullable<ImportPreviewState["unresolved"]> = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const row of parsed.valid) {
    let printing = await db.cardPrinting.findFirst({
      where: {
        collectorNumber: row.collectorNumber,
        language: row.language,
        set: { code: { equals: row.setCode, mode: "insensitive" } },
      },
      select: { id: true, name: true, finishes: true },
    });
    if (!printing) {
      try {
        const remote = await scryfall.getPrinting(
          row.setCode,
          row.collectorNumber,
          row.language,
        );
        await scryfall.synchronizePrintings([remote]);
        printing = await db.cardPrinting.findUnique({
          where: { scryfallId: remote.id },
          select: { id: true, name: true, finishes: true },
        });
      } catch {
        // The row remains unresolved and is reported to the user below.
      }
    }
    if (
      !printing ||
      printing.name.toLocaleLowerCase() !== row.cardName.toLocaleLowerCase() ||
      !printing.finishes.includes(row.finish)
    ) {
      unresolved.push({
        row: row.row,
        cardName: row.cardName,
        printing: `${row.setCode.toUpperCase()} #${row.collectorNumber}`,
      });
      continue;
    }
    const key = `${printing.id}:${row.finish}:${row.condition}:${row.language}`;
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
    recognized.push({ ...row, printingId: printing.id });
  }
  return { recognized, unresolved, invalid: parsed.invalid, duplicates };
}

const importRowsSchema = z.array(
  z.object({
    printingId: z.string().cuid(),
    quantity: z.number().int().min(1).max(9999),
    condition: z.enum(Condition),
    finish: z.enum(Finish),
    language: z.string().min(2).max(8),
    purchasePrice: z.number().nonnegative().optional(),
    storageLocation: z.string().max(120).optional(),
  }),
).max(10_000);

export async function commitImportAction(formData: FormData) {
  const user = await requireUser();
  const decoded = JSON.parse(z.string().parse(formData.get("rows"))) as unknown;
  const rows = importRowsSchema.parse(decoded);
  const collection = await db.collection.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!collection) throw new Error("Collection not found");

  await db.$transaction(
    rows.map((row) =>
      db.inventoryItem.create({
        data: {
          collectionId: collection.id,
          cardPrintingId: row.printingId,
          quantity: row.quantity,
          condition: row.condition,
          finish: row.finish,
          language: row.language,
          purchasePrice: row.purchasePrice,
          storageLocation: row.storageLocation || null,
        },
      }),
    ),
  );
  revalidatePath("/");
  revalidatePath("/collection");
  redirect("/collection?imported=1");
}
