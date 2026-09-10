"use server";

import { createHash, randomBytes } from "node:crypto";
import { Condition, Currency, Finish } from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSession,
  deleteSession,
  hashPassword,
  requireEntitlement,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { trialEndsAtFrom } from "@/lib/constants";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";
import { parseInventoryCsv } from "@/services/csv";
import { scryfall } from "@/services/scryfall";

export type FormState = { error?: string; notice?: string; devResetUrl?: string };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function enforceAuthRateLimit(email: string) {
  const ip = clientIpFrom(await headers());
  // Run both checks concurrently; block if EITHER bucket is exhausted.
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`auth:ip:${ip}`),
    rateLimit(`auth:email:${email}`),
  ]);
  return byIp.ok && byEmail.ok;
}

const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(10).max(128),
});

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentialsSchema
    .extend({ displayName: z.string().trim().min(2).max(60) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid name, email, and 10+ character password." };
  if (!(await enforceAuthRateLimit(parsed.data.email))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: "An account already exists for this email." };

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: parsed.data.email,
        displayName: parsed.data.displayName,
        passwordHash: await hashPassword(parsed.data.password),
        trialEndsAt: trialEndsAtFrom(),
      },
    });
    await tx.collection.create({ data: { userId: created.id, name: "My Collection" } });
    return created;
  });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid email or password." };
  if (!(await enforceAuthRateLimit(parsed.data.email))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return { error: "Invalid email or password." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function requestPasswordResetAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z.object({ email: z.email().trim().toLowerCase() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email." };
  if (!(await enforceAuthRateLimit(parsed.data.email))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const generic = { notice: "If an account exists for that email, we sent reset instructions." };
  if (!user) return generic;

  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const resetUrl = `${appUrl()}/reset-password?token=${token}`;
  const sent = await sendPasswordResetEmail(user.email, resetUrl);
  if (!sent.delivered && process.env.NODE_ENV !== "production") {
    return { ...generic, devResetUrl: resetUrl };
  }
  return generic;
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      token: z.string().min(20),
      password: z.string().min(10).max(128),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a 10+ character password from a valid reset link." };

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    include: { user: true },
  });
  if (!record || record.expiresAt <= new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    db.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await createSession(record.userId);
  redirect("/dashboard");
}

export async function deleteAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "DELETE") return { error: "Type DELETE to permanently remove your account." };

  const stripe = getStripe();
  if (stripe && user.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(user.stripeSubscriptionId).catch(() => undefined);
  }
  await deleteSession();
  await db.user.delete({ where: { id: user.id } });
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
  const user = await requireEntitlement();
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
  revalidatePath("/dashboard");
  revalidatePath("/collection");
  revalidatePath("/storage");
  revalidatePath("/add");

  const params = new URLSearchParams({ added: "1" });
  if (parsed.data.returnQuery) params.set("q", parsed.data.returnQuery);
  redirect(`/add?${params.toString()}`);
}

export async function deleteInventoryAction(formData: FormData) {
  const user = await requireEntitlement();
  const itemId = z.string().cuid().parse(formData.get("itemId"));
  await db.inventoryItem.deleteMany({
    where: { id: itemId, collection: { userId: user.id } },
  });
  revalidatePath("/dashboard");
  revalidatePath("/collection");
}

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(500),
  storageLocation: z.string().trim().max(120).optional(),
  condition: z.enum(Condition).optional(),
});

export type BulkUpdateState = { error?: string; updated?: number; deleted?: number };

export async function bulkUpdateInventoryAction(
  _: BulkUpdateState,
  formData: FormData,
): Promise<BulkUpdateState> {
  const user = await requireEntitlement();

  const raw = {
    ids: formData.getAll("ids"),
    storageLocation: formData.get("storageLocation") || undefined,
    condition: formData.get("condition") || undefined,
  };
  const parsed = bulkUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid selection or update values." };

  const { ids, storageLocation, condition } = parsed.data;
  if (!storageLocation && !condition) return { error: "Choose at least one field to update." };

  const data: { storageLocation?: string | null; condition?: Condition } = {};
  if (storageLocation !== undefined) data.storageLocation = storageLocation || null;
  if (condition !== undefined) data.condition = condition;

  const result = await db.inventoryItem.updateMany({
    where: { id: { in: ids }, collection: { userId: user.id } },
    data,
  });

  revalidatePath("/collection");
  revalidatePath("/dashboard");
  revalidatePath("/storage");
  return { updated: result.count };
}

export type RenameStorageState = { error?: string };

export async function renameStorageLocationAction(
  _: RenameStorageState,
  formData: FormData,
): Promise<RenameStorageState> {
  const user = await requireEntitlement();
  const parsed = z
    .object({
      from: z.string().trim().min(1).max(120),
      to: z.string().trim().min(1).max(120),
    })
    .safeParse({ from: formData.get("from"), to: formData.get("to") });

  if (!parsed.success) return { error: "Enter a location name (max 120 characters)." };
  if (parsed.data.from.toLowerCase() === "unassigned") {
    return { error: "Unassigned is not a location you can rename." };
  }

  const to = parsed.data.to;
  if (to.toLowerCase() === "unassigned") {
    return { error: "Pick a real location name, or use bulk edit to clear storage." };
  }

  await db.inventoryItem.updateMany({
    where: {
      collection: { userId: user.id },
      storageLocation: { equals: parsed.data.from, mode: "insensitive" },
    },
    data: { storageLocation: to },
  });

  revalidatePath("/storage");
  revalidatePath("/collection");
  revalidatePath("/dashboard");
  return {};
}

export async function bulkDeleteInventoryAction(
  _: BulkUpdateState,
  formData: FormData,
): Promise<BulkUpdateState> {
  const user = await requireEntitlement();
  const ids = z.array(z.string().cuid()).min(1).max(500).parse(formData.getAll("ids"));
  const result = await db.inventoryItem.deleteMany({
    where: { id: { in: ids }, collection: { userId: user.id } },
  });
  revalidatePath("/collection");
  revalidatePath("/dashboard");
  revalidatePath("/storage");
  return { deleted: result.count };
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
  await requireEntitlement();
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
  const user = await requireEntitlement();
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
  revalidatePath("/dashboard");
  revalidatePath("/collection");
  redirect("/collection?imported=1");
}
