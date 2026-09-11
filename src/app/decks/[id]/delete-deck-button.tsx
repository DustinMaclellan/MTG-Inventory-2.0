"use client";

import { useRef, type MouseEvent } from "react";
import { Trash2 } from "lucide-react";
import { deleteDeckAction } from "@/app/decks/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";

export function DeleteDeckButton({
  deckId,
  deckName,
  compact = false,
}: {
  deckId: string;
  deckName: string;
  compact?: boolean;
}) {
  const { m } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);

  function open(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        title={m.decks.deleteDeck}
        aria-haspopup="dialog"
        className={
          compact
            ? "relative z-10 rounded-md p-1 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
            : "w-full rounded-xl border border-rose-500/20 bg-rose-500/6 px-4 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
        }
        onClick={open}
      >
        {compact ? <Trash2 size={14} /> : m.decks.deleteDeck}
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(calc(100%-2rem),22rem)] rounded-2xl border border-white/10 bg-[#0f1318] p-0 text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop:bg-black/65"
        onClick={(event) => {
          event.stopPropagation();
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="space-y-4 p-5">
          <h2 className="text-base font-semibold tracking-tight">{m.decks.deleteDeck}</h2>
          <p className="text-sm leading-6 text-zinc-400 wrap-break-word [overflow-wrap:anywhere]">
            {interpolate(m.decks.deleteConfirm, { name: deckName })}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/6 hover:text-zinc-200 transition-colors"
            >
              {m.common.cancel}
            </button>
            <form action={deleteDeckAction}>
              <input type="hidden" name="deckId" value={deckId} />
              <button
                type="submit"
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/16 transition-colors"
              >
                {m.decks.deleteDeck}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
