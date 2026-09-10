"use client";

import { useActionState } from "react";
import { startCheckoutAction } from "@/app/billing-actions";
import type { FormState } from "@/app/actions";
import { PLAN_MONTHLY_USD, PLAN_YEARLY_USD } from "@/lib/constants";

export function CheckoutForm() {
  const [state, formAction, pending] = useActionState(startCheckoutAction, {} as FormState);

  return (
    <div className="space-y-4">
      {state.error && (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <form action={formAction}>
          <input type="hidden" name="interval" value="monthly" />
          <button disabled={pending} className="panel w-full p-5 text-left disabled:opacity-50">
            <p className="text-sm text-zinc-500">Monthly</p>
            <p className="mt-2 text-2xl font-semibold">${PLAN_MONTHLY_USD}/mo</p>
            <p className="mt-3 text-sm text-emerald-400">{pending ? "Redirecting…" : "Continue to checkout"}</p>
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="interval" value="yearly" />
          <button disabled={pending} className="panel w-full p-5 text-left disabled:opacity-50">
            <p className="text-sm text-emerald-400">Yearly</p>
            <p className="mt-2 text-2xl font-semibold">${PLAN_YEARLY_USD}/yr</p>
            <p className="mt-3 text-sm text-emerald-400">{pending ? "Redirecting…" : "Continue to checkout"}</p>
          </button>
        </form>
      </div>
    </div>
  );
}
