"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Condition, Currency, Finish } from "@prisma/client";
import { addInventoryAction } from "@/app/actions";
import { useI18n } from "@/i18n/provider";
import { formatMoney } from "@/lib/money";

type PricePoint = { finish: Finish; market: number | null };

function rarityClass(rarity: string) {
  switch (rarity.toLowerCase()) {
    case "mythic":
      return "bg-orange-400/10 text-orange-300";
    case "rare":
      return "bg-yellow-400/10 text-yellow-300";
    case "uncommon":
      return "bg-zinc-100/8 text-zinc-300";
    default:
      return "bg-white/4 text-zinc-500";
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
  defaultCondition,
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
  defaultCondition: Condition;
}) {
  const { locale, m } = useI18n();
  const finishOptions = finishes.length > 0 ? finishes : (["NONFOIL"] as Finish[]);
  const [finish, setFinish] = useState<Finish>(finishOptions[0] ?? "NONFOIL");
  const finishLocked = finishOptions.length <= 1;

  const market = useMemo(
    () => prices.find((price) => price.finish === finish)?.market ?? null,
    [finish, prices],
  );

  return (
    <article className="panel group overflow-hidden transition-colors hover:border-white/12">
      <div className="flex gap-4 p-4">
        <div className="relative aspect-[63/88] w-[92px] shrink-0 overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/8">
          {imageSmallUrl && (
            <Image src={imageSmallUrl} alt="" fill sizes="92px" className="object-cover" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-[15px] font-semibold leading-snug tracking-tight">{name}</h2>
          <p className="mt-1 truncate text-xs text-zinc-400">{setName}</p>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            {setCode.toUpperCase()} · #{collectorNumber}
          </p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize tracking-wide ${rarityClass(rarity)}`}
            >
              {rarity}
            </span>
            <span className={`text-sm font-semibold tabular-nums ${market == null ? "text-zinc-600" : "text-zinc-100"}`}>
              {market != null ? formatMoney(market, currency, locale) : "—"}
            </span>
          </div>
        </div>
      </div>

      <form
        action={addInventoryAction}
        className="grid grid-cols-2 gap-3 border-t border-white/6 bg-black/20 p-4"
      >
        <input type="hidden" name="cardPrintingId" value={printingId} />
        <input type="hidden" name="returnQuery" value={query} />

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {m.add.qty}
          </span>
          <input
            className="field min-w-0 px-3 py-2 text-sm"
            name="quantity"
            type="number"
            min="1"
            defaultValue="1"
            aria-label={m.add.quantity}
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {m.add.finish}
          </span>
          {finishLocked ? (
            <>
              <input type="hidden" name="finish" value={finish} />
              <span className="field flex min-w-0 items-center px-3 py-2 text-sm text-zinc-200">
                {m.finish[finish]}
              </span>
            </>
          ) : (
            <select
              className="field min-w-0 px-3 py-2 pr-8 text-sm"
              name="finish"
              value={finish}
              onChange={(event) => setFinish(event.target.value as Finish)}
            >
              {finishOptions.map((option) => (
                <option key={option} value={option}>
                  {m.finish[option]}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {m.add.condition}
          </span>
          <select className="field min-w-0 px-3 py-2 pr-8 text-sm" name="condition" defaultValue={defaultCondition}>
            <option value="NEAR_MINT">{m.condition.NEAR_MINT}</option>
            <option value="LIGHTLY_PLAYED">{m.condition.LIGHTLY_PLAYED}</option>
            <option value="MODERATELY_PLAYED">{m.condition.MODERATELY_PLAYED}</option>
            <option value="HEAVILY_PLAYED">{m.condition.HEAVILY_PLAYED}</option>
            <option value="DAMAGED">{m.condition.DAMAGED}</option>
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {m.add.paidEach}
          </span>
          <input
            className="field min-w-0 px-3 py-2 text-sm"
            name="purchasePrice"
            type="number"
            min="0"
            step=".01"
            placeholder={market != null ? formatMoney(market, currency, locale) : "—"}
          />
        </label>

        <label className="col-span-2 flex min-w-0 flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {m.add.storageLocation}
          </span>
          <input
            className="field min-w-0 px-3 py-2 text-sm"
            name="storageLocation"
            placeholder={m.add.storageHint}
          />
        </label>

        <button className="button-primary col-span-2 py-2.5 text-sm">{m.add.addToCollection}</button>
      </form>
    </article>
  );
}
