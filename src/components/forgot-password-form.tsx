"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";

export function ForgotPasswordForm({
  action,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <label className="block text-sm text-zinc-400">
        Email
        <input name="email" type="email" autoComplete="email" required className="field mt-2" />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{state.notice}</p>
      )}
      {state.devResetUrl && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300">
          Development reset link:{" "}
          <Link href={state.devResetUrl} className="text-emerald-400 break-all">
            {state.devResetUrl}
          </Link>
        </p>
      )}
      <button disabled={pending} className="button-primary w-full disabled:opacity-50">
        {pending ? "Please wait…" : "Send reset link"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        <Link className="text-emerald-400 hover:text-emerald-300" href="/login">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
