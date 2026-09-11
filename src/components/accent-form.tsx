"use client";

import { setAccentAction } from "@/app/actions";
import { ACCENT_SWATCHES, type AccentName } from "@/lib/accent";
import { useI18n } from "@/i18n/provider";

export function AccentForm({ accent }: { accent: AccentName }) {
  const { m } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ACCENT_SWATCHES.map((swatch) => {
        const active = accent === swatch.id;
        const label = m.settings.accents[swatch.id];
        return (
          <form action={setAccentAction} key={swatch.id}>
            <input type="hidden" name="accent" value={swatch.id} />
            <button
              type="submit"
              aria-pressed={active}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-colors ${
                active
                  ? "border-accent/40 bg-accent/8 text-zinc-100"
                  : "border-white/8 bg-white/[.02] text-zinc-400 hover:border-white/14 hover:text-zinc-200"
              }`}
            >
              <span
                className="size-6 shrink-0 rounded-full ring-2 ring-white/10"
                style={{ background: swatch.hex }}
                aria-hidden
              />
              {label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
