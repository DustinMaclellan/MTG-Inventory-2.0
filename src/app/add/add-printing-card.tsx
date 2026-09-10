"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Currency, Finish } from "@prisma/client";
import { addInventoryAction } from "@/app/actions";
import { useI18n } from "@/i18n/provider";
import { formatMoney } from "@/lib/money";

type PricePoint = { finish: Finish; market: number | null };

function rarityColor(rarity: string) {
  switch (rarity.toLowerCase()) {
    case "mythic":
      return "text-orange-400";
    case "rare":
      return "text-yellow-400";
    case "uncommon":
      return "text-zinc-300";
    default:
      return "text-zinc-600";
  }
}

export function AddPrintingCard({
  printingId,
  name,
  setName,
  setCode,
  collectorNumber,
  rarity,
  imageSmallUrl,
  finishes,
  prices,
  currency,
  query,
}: {
  printingId: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  imageSmallUrl: string | null;
  finishes: Finish[];
  prices: PricePoint[];
  currency: Currency;
  query: string;
}) {
  const { locale, m } = useI18n();
  const defaultFinish = finishes[0] ?? "NONFOIL";
  const [finish, setFinish] = useState<Finish>(defaultFinish);

  const market = useMemo(
    () => prices.find((price) => price.finish === finish)?.market ?? null,
    [finish, prices],
  );

  return (
    <article className="panel overflow-hidden">
      <div className="flex gap-4 p-4 pb-3">
        <div className="relative aspect-[63/88] w-[88px] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-md">
          {imageSmallUrl && (
            <Image src={imageSmallUrl} alt="" fill sizes="88px" className="object-cover" />
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-between py-0.5">
          <div className="min-w-0">
            <h2 className="truncate font-semibold leading-snug">{name}</h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{setName}</p>
            <p className="mt-0.5 text-[11px] text-zinc-600">
              {setCode.toUpperCase()} · #{collectorNumber}
            </p>
            <span
              className={`mt-1.5 inline-block text-[11px] font-medium capitalize ${rarityColor(rarity)}`}
            >
              {rarity}
            </span>
          </div>
          <div className="mt-3">
            {market !== null ? (
              <span className="text-sm font-semibold">{formatMoney(market, currency, locale)}</span>
            ) : (
              <span className="text-sm text-zinc-600">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/6" />

      <form action={addInventoryAction} className="grid grid-cols-2 gap-2.5 p-4">
        <input type="hidden" name="cardPrintingId" value={printingId} />
        <input type="hidden" name="returnQuery" value={query} />

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            {m.add.qty}
          </label>
          <input
            className="field px-3 py-2 text-sm"
            name="quantity"
            type="number"
            min="1"
            defaultValue="1"
            aria-label={m.add.quantity}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            {m.add.finish}
          </label>
          <select
            className="field px-3 py-2 text-sm"
            name="finish"
            value={finish}
            onChange={(event) => setFinish(event.target.value as Finish)}
          >
            {finishes.map((option) => (
              <option key={option} value={option}>
                {m.finish[option]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            {m.add.condition}
          </label>
          <select className="field px-3 py-2 text-sm" name="condition" defaultValue="NEAR_MINT">
            <option value="NEAR_MINT">{m.condition.NEAR_MINT}</option>
            <option value="LIGHTLY_PLAYED">{m.condition.LIGHTLY_PLAYED}</option>
            <option value="MODERATELY_PLAYED">{m.condition.MODERATELY_PLAYED}</option>
            <option value="HEAVILY_PLAYED">{m.condition.HEAVILY_PLAYED}</option>
            <option value="DAMAGED">{m.condition.DAMAGED}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            {m.add.paidEach}
          </label>
          <input
            className="field px-3 py-2 text-sm"
            name="purchasePrice"
            type="number"
            min="0"
            step=".01"
            placeholder={market !== null ? formatMoney(market, currency, locale) : "$ —"}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            {m.add.storageLocation}
          </label>
          <input
            className="field px-3 py-2 text-sm"
            name="storageLocation"
            placeholder={m.add.storageHint}
          />
        </div>
        <button className="button-primary col-span-2 py-2.5 text-sm">{m.add.addToCollection}</button>
      </form>
    </article>
  );
}
