"use client";

import { setLocaleAction } from "@/app/actions";
import { useI18n } from "@/i18n/provider";

function localeButtonClass(active: boolean) {
  return `rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
    active ? "bg-white/10 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
  }`;
}

function LocaleForm({
  next,
  label,
  active,
}: {
  next: "en" | "fr";
  label: string;
  active: boolean;
}) {
  return (
    <form action={setLocaleAction} className="inline">
      <input type="hidden" name="locale" value={next} />
      <button type="submit" className={localeButtonClass(active)}>
        {label}
      </button>
    </form>
  );
}

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale } = useI18n();

  return (
    <div
      className={`inline-flex flex-row items-center rounded-lg border border-white/8 bg-black/20 p-0.5 ${className}`}
    >
      <LocaleForm next="en" label="EN" active={locale === "en"} />
      <LocaleForm next="fr" label="FR" active={locale === "fr"} />
    </div>
  );
}

export function LanguageForm() {
  const { locale, m } = useI18n();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <form action={setLocaleAction}>
        <input type="hidden" name="locale" value="en" />
        <button
          type="submit"
          className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
            locale === "en"
              ? "border-accent/40 bg-accent/8 text-zinc-100"
              : "border-white/8 bg-white/[.02] text-zinc-400 hover:border-white/14 hover:text-zinc-200"
          }`}
        >
          {m.settings.english}
        </button>
      </form>
      <form action={setLocaleAction}>
        <input type="hidden" name="locale" value="fr" />
        <button
          type="submit"
          className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
            locale === "fr"
              ? "border-accent/40 bg-accent/8 text-zinc-100"
              : "border-white/8 bg-white/[.02] text-zinc-400 hover:border-white/14 hover:text-zinc-200"
          }`}
        >
          {m.settings.french}
        </button>
      </form>
    </div>
  );
}
