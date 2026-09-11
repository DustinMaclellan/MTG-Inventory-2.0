"use server";

import { createHash, randomBytes } from "node:crypto";
import { Condition, Currency, Finish } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSession,
  deleteSession,
  getCurrentUser,
  hashPassword,
  requireEntitlement,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { persistLocaleCookie } from "@/i18n/cookie";
import { isLocale } from "@/i18n/config";
import { getMessages, interpolate, type Messages } from "@/i18n";
import { getRequestLocale } from "@/i18n/request";
import { SESSION_COOKIE, trialEndsAtFrom } from "@/lib/constants";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateNewPassword,
  type NewPasswordIssue,
} from "@/lib/password";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";
import { coerceFinish } from "@/lib/finish";
import { parseImportPaste } from "@/services/import-parse";
import { resolveImportLines, type ImportChoice, type RecognizedImportRow } from "@/services/import-resolve";

export type FormState = {
  error?: string;
  notice?: string;
  devResetUrl?: string;
  preferredCurrency?: Currency;
};

async function t() {
  return getMessages(await getRequestLocale());
}

export async function setLocaleAction(formData: FormData) {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;

  await persistLocaleCookie(locale);
  const user = await getCurrentUser();
  if (user) {
    await db.user.update({
      where: { id: user.id },
      data: { preferredLocale: locale },
    });
  }
  revalidatePath("/", "layout");
}

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

function newPasswordMessage(m: Messages, issue: NewPasswordIssue) {
  if (issue === "length") {
    return interpolate(m.errors.passwordLength, { count: PASSWORD_MIN_LENGTH });
  }
  if (issue === "classes") return m.errors.passwordClasses;
  if (issue === "common") return m.errors.passwordCommon;
  if (issue === "personal") return m.errors.passwordPersonal;
  return m.errors.passwordRepeat;
}

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const m = await t();
  const parsed = z
    .object({
      displayName: z.string().trim().min(2).max(60),
      email: z.email().trim().toLowerCase(),
      password: z.string().max(PASSWORD_MAX_LENGTH),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: m.errors.registerInvalid };
  const passwordIssue = validateNewPassword(parsed.data.password, parsed.data.email);
  if (passwordIssue) return { error: newPasswordMessage(m, passwordIssue) };
  if (!(await enforceAuthRateLimit(parsed.data.email))) {
    return { error: m.errors.tooMany };
  }

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: m.errors.accountExists };

  const locale = await getRequestLocale();
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: parsed.data.email,
        displayName: parsed.data.displayName,
        passwordHash: await hashPassword(parsed.data.password),
        trialEndsAt: trialEndsAtFrom(),
        preferredLocale: locale,
      },
    });
    await tx.collection.create({
      data: { userId: created.id, name: locale === "fr" ? "Ma collection" : "My Collection" },
    });
    return created;
  });
  await persistLocaleCookie(locale);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const m = await t();
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: m.errors.invalidAuth };
  if (!(await enforceAuthRateLimit(parsed.data.email))) {
    return { error: m.errors.tooMany };
  }
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return { error: m.errors.invalidAuth };
  }
  await persistLocaleCookie(isLocale(user.preferredLocale) ? user.preferredLocale : "en");
  await createSession(user.id);
  redirect("/dashboard");
}

export async function requestPasswordResetAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z.object({ email: z.email().trim().toLowerCase() }).safeParse(Object.fromEntries(formData));
  const m = await t();
  if (!parsed.success) return { error: m.errors.resetEmail };
  if (!(await enforceAuthRateLimit(parsed.data.email))) {
    return { error: m.errors.tooMany };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const generic = { notice: m.auth.resetSent };
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
      password: z.string().max(PASSWORD_MAX_LENGTH),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: (await t()).errors.resetPassword };

  const m = await t();
  const passwordIssue = validateNewPassword(parsed.data.password);
  if (passwordIssue) return { error: newPasswordMessage(m, passwordIssue) };

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    include: { user: true },
  });
  if (!record || record.expiresAt <= new Date()) {
    return { error: m.errors.resetExpired };
  }

  const personalIssue = validateNewPassword(parsed.data.password, record.user.email);
  if (personalIssue) return { error: newPasswordMessage(m, personalIssue) };

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
  if (confirm !== "DELETE") return { error: (await t()).errors.deleteConfirm };

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

export async function updateProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({ displayName: z.string().trim().min(2).max(60) })
    .safeParse({ displayName: formData.get("displayName") });
  if (!parsed.success) return { error: (await t()).errors.nameLength };

  await db.user.update({
    where: { id: user.id },
    data: { displayName: parsed.data.displayName },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { notice: (await t()).settings.nameSaved };
}

export async function updatePreferencesAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({ preferredCurrency: z.enum(Currency) })
    .safeParse({ preferredCurrency: formData.get("preferredCurrency") });
  if (!parsed.success) return { error: (await t()).errors.currency };

  await db.user.update({
    where: { id: user.id },
    data: { preferredCurrency: parsed.data.preferredCurrency },
  });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/collection");
  revalidatePath("/storage");
  return {
    notice: (await t()).settings.currencySaved,
    preferredCurrency: parsed.data.preferredCurrency,
  };
}

export async function changePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const m = await t();
  const parsed = z
    .object({
      currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
      password: z.string().max(PASSWORD_MAX_LENGTH),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: interpolate(m.errors.passwordLength, { count: PASSWORD_MIN_LENGTH }) };
  }

  const passwordIssue = validateNewPassword(parsed.data.password, user.email);
  if (passwordIssue) return { error: newPasswordMessage(m, passwordIssue) };

  if (!(await enforceAuthRateLimit(user.email))) {
    return { error: m.errors.tooMany };
  }

  const fresh = await db.user.findUnique({ where: { id: user.id } });
  if (!fresh || !(await verifyPassword(fresh.passwordHash, parsed.data.currentPassword))) {
    return { error: (await t()).errors.passwordWrong };
  }
  if (parsed.data.currentPassword === parsed.data.password) {
    return { error: (await t()).errors.passwordSame };
  }

  const currentToken = (await cookies()).get(SESSION_COOKIE)?.value;
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    db.session.deleteMany({
      where: {
        userId: user.id,
        ...(currentToken ? { tokenHash: { not: hashToken(currentToken) } } : {}),
      },
    }),
  ]);

  revalidatePath("/settings");
  return { notice: "Password updated. Other signed-in sessions were signed out." };
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
      purchaseCurrency: user.preferredCurrency,
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
  revalidatePath("/storage");
  if (formData.get("returnTo") === "/collection") redirect("/collection");
}

const updateInventorySchema = z.object({
  itemId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(9999),
  condition: z.enum(Condition),
  finish: z.enum(Finish),
  purchasePrice: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.union([z.null(), z.coerce.number().nonnegative().max(1_000_000)]),
  ),
  purchaseCurrency: z.enum(Currency),
  purchaseDate: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.union([z.null(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  ),
  purchaseSource: z.string().trim().max(120).optional(),
  storageLocation: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  language: z.string().trim().min(2).max(8),
});

export async function updateInventoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireEntitlement();
  const parsed = updateInventorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: (await t()).collection.invalidLot };

  const item = await db.inventoryItem.findFirst({
    where: { id: parsed.data.itemId, collection: { userId: user.id } },
    select: { id: true, cardPrinting: { select: { finishes: true } } },
  });
  if (!item) return { error: (await t()).collection.invalidLot };
  if (!item.cardPrinting.finishes.includes(parsed.data.finish) && item.cardPrinting.finishes.length > 0) {
    return { error: (await t()).collection.finishUnavailable };
  }

  await db.inventoryItem.update({
    where: { id: item.id },
    data: {
      quantity: parsed.data.quantity,
      condition: parsed.data.condition,
      finish: parsed.data.finish,
      purchasePrice: parsed.data.purchasePrice,
      purchaseCurrency: parsed.data.purchaseCurrency,
      purchaseDate: parsed.data.purchaseDate
        ? new Date(`${parsed.data.purchaseDate}T12:00:00.000Z`)
        : null,
      purchaseSource: parsed.data.purchaseSource || null,
      storageLocation: parsed.data.storageLocation || null,
      notes: parsed.data.notes || null,
      language: parsed.data.language,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/collection");
  revalidatePath(`/collection/${item.id}`);
  revalidatePath("/storage");
  return { notice: (await t()).collection.lotSaved };
}

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(500),
  storageLocation: z.string().trim().max(120).optional(),
  condition: z.enum(Condition).optional(),
  finish: z.enum(Finish).optional(),
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
    finish: formData.get("finish") || undefined,
  };
  const parsed = bulkUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid selection or update values." };

  const { ids, storageLocation, condition, finish } = parsed.data;
  if (!storageLocation && !condition && !finish) return { error: "Choose at least one field to update." };

  const owned = { id: { in: ids }, collection: { userId: user.id } };
  const data: { storageLocation?: string | null; condition?: Condition } = {};
  if (storageLocation !== undefined) data.storageLocation = storageLocation || null;
  if (condition !== undefined) data.condition = condition;

  let updated = 0;
  if (storageLocation !== undefined || condition !== undefined) {
    const result = await db.inventoryItem.updateMany({ where: owned, data });
    updated = result.count;
  }

  if (finish) {
    const items = await db.inventoryItem.findMany({
      where: owned,
      select: { id: true, cardPrinting: { select: { finishes: true } } },
    });
    const compatible = items
      .filter((item) => {
        const available = item.cardPrinting.finishes;
        return available.length === 0 || available.includes(finish);
      })
      .map((item) => item.id);
    if (compatible.length === 0 && !storageLocation && !condition) {
      return { error: "That finish is not available for the selected printings." };
    }
    if (compatible.length > 0) {
      const result = await db.inventoryItem.updateMany({
        where: { id: { in: compatible } },
        data: { finish },
      });
      updated = Math.max(updated, result.count);
    }
  }

  revalidatePath("/collection");
  revalidatePath("/dashboard");
  revalidatePath("/storage");
  return { updated };
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

export type StorageFormState = { error?: string; notice?: string };

export async function mergeStorageLocationsAction(
  _: StorageFormState,
  formData: FormData,
): Promise<StorageFormState> {
  const user = await requireEntitlement();
  const m = await t();
  const parsed = z
    .object({
      from: z.string().trim().min(1).max(120),
      to: z.string().trim().min(1).max(120),
    })
    .safeParse({ from: formData.get("from"), to: formData.get("to") });
  if (!parsed.success) return { error: m.storage.invalidLocation };

  const from = parsed.data.from;
  const to = parsed.data.to;
  if (from.toLowerCase() === "unassigned" || to.toLowerCase() === "unassigned") {
    return { error: m.storage.reservedLocation };
  }
  if (from.toLowerCase() === to.toLowerCase()) return { error: m.storage.mergeSame };

  await db.inventoryItem.updateMany({
    where: {
      collection: { userId: user.id },
      storageLocation: { equals: from, mode: "insensitive" },
    },
    data: { storageLocation: to },
  });

  revalidatePath("/storage");
  revalidatePath("/collection");
  revalidatePath("/dashboard");
  return { notice: m.storage.mergeDone };
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
  recognized?: RecognizedImportRow[];
  choices?: ImportChoice[];
  unresolved?: Array<{ row: number; cardName: string; printing: string }>;
  invalid?: Array<{ row: number; message: string }>;
  duplicates?: number;
};

export async function previewImportAction(
  _: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  await requireEntitlement();
  const pasted = z.string().max(2_000_000).safeParse(formData.get("csv"));
  if (!pasted.success) return { error: "Paste a list smaller than 2 MB." };
  const parsed = parseImportPaste(pasted.data);
  if (parsed.valid.length === 0 && parsed.invalid.length === 0) {
    return { error: "Paste a deck list or CSV first." };
  }
  const resolved = await resolveImportLines(parsed.valid);
  return { ...resolved, invalid: parsed.invalid };
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

  const printings = await db.cardPrinting.findMany({
    where: { id: { in: [...new Set(rows.map((row) => row.printingId))] } },
    select: { id: true, finishes: true },
  });
  const allowed = new Map(printings.map((printing) => [printing.id, printing.finishes]));
  const valid = rows.flatMap((row) => {
    const available = allowed.get(row.printingId);
    if (!available) return [];
    return [{ ...row, finish: coerceFinish(row.finish, available) }];
  });
  if (valid.length === 0) throw new Error("None of those printings could be imported");

  await db.$transaction(
    valid.map((row) =>
      db.inventoryItem.create({
        data: {
          collectionId: collection.id,
          cardPrintingId: row.printingId,
          quantity: row.quantity,
          condition: row.condition,
          finish: row.finish,
          language: row.language,
          purchasePrice: row.purchasePrice,
          purchaseCurrency: user.preferredCurrency,
          storageLocation: row.storageLocation || null,
        },
      }),
    ),
  );
  revalidatePath("/dashboard");
  revalidatePath("/collection");
  redirect("/collection?imported=1");
}
