"use client";

import { useActionState } from "react";
import { deleteAccountAction } from "@/app/actions";
import { openBillingPortalAction } from "@/app/billing-actions";
import type { FormState } from "@/app/actions";

export function ManageBillingButton({ hasCustomer }: { hasCustomer: boolean }) {
  const [state, formAction, pending] = useActionState(openBillingPortalAction, {});

  if (!hasCustomer) return null;

  return (
    <form action={formAction}>
      {state.error && (
        <p role="alert" className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="button-primary text-sm disabled:opacity-50">
        {pending ? "Opening portal…" : "Manage billing"}
      </button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccountAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm text-zinc-400">
        Type DELETE to confirm
        <input name="confirm" className="field mt-2" autoComplete="off" />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-xl bg-rose-500/15 px-4 py-2.5 text-sm font-medium text-rose-200 disabled:opacity-50">
        {pending ? "Deleting…" : "Delete account"}
      </button>
    </form>
  );
}
