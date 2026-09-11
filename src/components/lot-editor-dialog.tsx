"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { Currency } from "@prisma/client";
import { useI18n } from "@/i18n/provider";
import { formatMoney } from "@/lib/money";
import type { CollectionRow } from "@/components/collection-table";
import { LotEditor } from "@/components/lot-editor";

export function LotEditorDialog({
  item,
  storageLocations,
  currencies,
  displayCurrency,
  onClose,
}: {
  item: CollectionRow;
  storageLocations: string[];
  currencies: Currency[];
  displayCurrency: Currency;
  onClose: () => void;
}) {
  const { locale, m } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const printing = item.cardPrinting;
  const image = printing.imageNormalUrl ?? printing.imageSmallUrl;
  const market = printing.currentPrices.find((price) => price.finish === item.finish)?.market ?? null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }, [item.id]);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(calc(100%-2rem),42rem)] max-h-[min(90vh,52rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1318] p-0 text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop:bg-black/65"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-white/8 bg-[#0f1318] px-5 py-4">
        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/8">
          {image && (
            <Image src={image} alt="" fill sizes="44px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight">{printing.name}</h2>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {printing.set.name} · {printing.set.code.toUpperCase()} #{printing.collectorNumber} · {m.finish[item.finish]}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {m.collection.market}: {formatMoney(market, displayCurrency, locale)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="rounded-md p-1 text-zinc-500 hover:bg-white/6 hover:text-zinc-200 transition-colors"
          aria-label={m.common.cancel}
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5">
        <LotEditor
          key={item.id}
          itemId={item.id}
          name={printing.name}
          quantity={item.quantity}
          condition={item.condition}
          finish={item.finish}
          finishes={printing.finishes}
          purchasePrice={item.purchasePrice}
          purchaseCurrency={item.purchaseCurrency}
          purchaseDate={item.purchaseDate}
          purchaseSource={item.purchaseSource}
          storageLocation={item.storageLocation ?? ""}
          notes={item.notes}
          language={item.language}
          storageLocations={storageLocations}
          currencies={currencies}
          onSaved={onClose}
          onDeleted={onClose}
        />
      </div>
    </dialog>
  );
}
