"use client";

import { useActionState, useEffect, useMemo } from "react";
import type { Condition, Currency, Finish } from "@prisma/client";
import {
  deleteInventoryAction,
  updateInventoryAction,
  type FormState,
} from "@/app/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";

const CONDITIONS: Condition[] = [
  "NEAR_MINT",
  "LIGHTLY_PLAYED",
  "MODERATELY_PLAYED",
  "HEAVILY_PLAYED",
  "DAMAGED",
];

const LANGUAGES = ["en", "fr", "de", "es", "it", "ja", "ko", "pt", "ru", "zhs", "zht", "ph"] as const;

export function LotEditor({
  itemId,
  name,
  quantity,
  condition,
  finish,
  finishes,
  purchasePrice,
  purchaseCurrency,
  purchaseDate,
  purchaseSource,
  storageLocation,
  notes,
  language,
  storageLocations,
  currencies,
  onSaved,
  onDeleted,
}: {
  itemId: string;
  name: string;
  quantity: number;
  condition: Condition;
  finish: Finish;
  finishes: Finish[];
  purchasePrice: number | null;
  purchaseCurrency: Currency;
  purchaseDate: string;
  purchaseSource: string;
  storageLocation: string;
  notes: string;
  language: string;
  storageLocations: string[];
  currencies: Currency[];
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const { m } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateInventoryAction, {});
  const finishOptions = finishes.length > 0 ? finishes : ([finish] as Finish[]);
  const finishLocked = finishOptions.length <= 1;
  const languageOptions = LANGUAGES.includes(language as (typeof LANGUAGES)[number])
    ? LANGUAGES
    : [language, ...LANGUAGES];
  const locationOptions = useMemo(() => {
    const names = new Set(storageLocations.map((entry) => entry.trim()).filter(Boolean));
    if (storageLocation.trim()) names.add(storageLocation.trim());
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [storageLocation, storageLocations]);

  useEffect(() => {
    if (!pending && state.notice) onSaved?.();
  }, [onSaved, pending, state.notice]);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="itemId" value={itemId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={m.add.qty}>
            <input
              className="field min-w-0 px-3 py-2 text-sm"
              name="quantity"
              type="number"
              min="1"
              max="9999"
              defaultValue={quantity}
              required
            />
          </Field>

          <Field label={m.add.finish}>
            {finishLocked ? (
              <>
                <input type="hidden" name="finish" value={finishOptions[0]} />
                <span className="field flex min-w-0 items-center px-3 py-2 text-sm text-zinc-200">
                  {m.finish[finishOptions[0]]}
                </span>
              </>
            ) : (
              <select
                className="field min-w-0 px-3 py-2 pr-8 text-sm"
                name="finish"
                defaultValue={finishOptions.includes(finish) ? finish : finishOptions[0]}
              >
                {finishOptions.map((option) => (
                  <option key={option} value={option}>
                    {m.finish[option]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label={m.add.condition}>
            <select
              className="field min-w-0 px-3 py-2 pr-8 text-sm"
              name="condition"
              defaultValue={condition}
            >
              {CONDITIONS.map((value) => (
                <option key={value} value={value}>
                  {m.condition[value]}
                </option>
              ))}
            </select>
          </Field>

          <Field label={m.collection.cardLanguage}>
            <select
              className="field min-w-0 px-3 py-2 pr-8 text-sm"
              name="language"
              defaultValue={language}
            >
              {languageOptions.map((code) => (
                <option key={code} value={code}>
                  {m.cardLang[code as keyof typeof m.cardLang] ?? code.toUpperCase()}
                </option>
              ))}
            </select>
          </Field>

          <Field label={m.add.paidEach}>
            <input
              className="field min-w-0 px-3 py-2 text-sm"
              name="purchasePrice"
              type="number"
              min="0"
              step=".01"
              defaultValue={purchasePrice ?? ""}
            />
          </Field>

          <Field label={m.collection.purchaseCurrency}>
            <select
              className="field min-w-0 px-3 py-2 pr-8 text-sm"
              name="purchaseCurrency"
              defaultValue={purchaseCurrency}
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>

          <Field label={m.collection.purchaseDate}>
            <input
              className="field min-w-0 px-3 py-2 text-sm"
              name="purchaseDate"
              type="date"
              defaultValue={purchaseDate}
            />
          </Field>

          <Field label={m.collection.purchaseSource}>
            <input
              className="field min-w-0 px-3 py-2 text-sm"
              name="purchaseSource"
              defaultValue={purchaseSource}
              maxLength={120}
              placeholder={m.collection.purchaseSourcePlaceholder}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label={m.add.storageLocation}>
              <select
                className="field min-w-0 px-3 py-2 pr-8 text-sm"
                name="storageLocation"
                defaultValue={storageLocation.trim()}
              >
                <option value="">{m.common.unassigned}</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <label className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {m.collection.notes}
            </span>
            <textarea
              className="field min-h-24 min-w-0 resize-y px-3 py-2 text-sm"
              name="notes"
              defaultValue={notes}
              maxLength={1000}
              placeholder={m.collection.notesPlaceholder}
            />
          </label>
        </div>

        {state.error && (
          <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
            {state.error}
          </p>
        )}

        <button disabled={pending} className="button-primary text-sm disabled:opacity-50">
          {pending ? m.common.saving : m.collection.saveLot}
        </button>
      </form>

      <form
        action={async (formData) => {
          onDeleted?.();
          await deleteInventoryAction(formData);
        }}
        className="border-t border-white/8 pt-4"
        onSubmit={(event) => {
          if (!confirm(interpolate(m.collection.deleteLotConfirm, { name }))) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="itemId" value={itemId} />
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-700">
          {m.decks.danger}
        </p>
        <button
          type="submit"
          className="rounded-xl border border-rose-500/20 bg-rose-500/6 px-4 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          {m.collection.deleteLot}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
