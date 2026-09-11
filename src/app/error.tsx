"use client";

import { useI18n } from "@/i18n/provider";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { m } = useI18n();
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          Mystic Ledger
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{m.errors.unexpected}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{m.errors.unexpectedBody}</p>
        <button type="button" onClick={reset} className="button-primary mt-8 text-sm">
          {m.errors.tryAgain}
        </button>
      </div>
    </div>
  );
}
