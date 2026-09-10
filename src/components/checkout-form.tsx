"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { startCheckoutAction } from "@/app/billing-actions";
import type { FormState } from "@/app/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";
import { PLAN_MONTHLY_USD, PLAN_YEARLY_USD } from "@/lib/constants";

const SAVINGS_PCT = Math.round(
  (1 - PLAN_YEARLY_USD / (PLAN_MONTHLY_USD * 12)) * 100,
);

export function CheckoutForm() {
  const { m } = useI18n();
  const [state, formAction, pending] = useActionState(startCheckoutAction, {} as FormState);

  return (
    <div className="space-y-5">
      {state.error && (
        <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <form action={formAction}>
          <input type="hidden" name="interval" value="monthly" />
          <button
            disabled={pending}
            className="group panel w-full p-6 text-left transition-all duration-200 hover:border-white/14 hover:shadow-[0_20px_50px_rgba(0,0,0,.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{m.marketing.monthly}</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-3xl font-semibold">${PLAN_MONTHLY_USD}</span>
              <span className="mb-0.5 text-zinc-500">{m.subscribe.perMo}</span>
            </div>
            <p className="mt-4 text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
              {pending ? m.subscribe.redirecting : m.subscribe.continue}
            </p>
          </button>
        </form>

        <form action={formAction}>
          <input type="hidden" name="interval" value="yearly" />
          <button
            disabled={pending}
            className="group panel relative w-full overflow-hidden border-emerald-400/20 p-6 text-left transition-all duration-200 hover:border-emerald-400/35 hover:shadow-[0_20px_50px_rgba(52,211,153,.08)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-emerald-400/3 pointer-events-none" aria-hidden />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">{m.marketing.yearly}</p>
                <span className="badge text-[10px]">{interpolate(m.marketing.savePct, { pct: SAVINGS_PCT })}</span>
              </div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-3xl font-semibold">${PLAN_YEARLY_USD}</span>
                <span className="mb-0.5 text-zinc-500">{m.subscribe.perYr}</span>
              </div>
              <p className="mt-4 text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                {pending ? m.subscribe.redirecting : m.subscribe.continue}
              </p>
            </div>
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5">
          <Lock size={11} className="text-zinc-500" />
          {m.subscribe.secured}
        </span>
        <span>·</span>
        <span>{m.subscribe.cancelPortal}</span>
        <span>·</span>
        <span>{m.subscribe.noFees}</span>
      </div>
    </div>
  );
}
