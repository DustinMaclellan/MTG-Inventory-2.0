"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { useI18n } from "@/i18n/provider";

export function ForgotPasswordForm({
  action,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
}) {
  const { m } = useI18n();
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <label className="block text-sm text-zinc-400">
        {m.auth.email}
        <input name="email" type="email" autoComplete="email" required className="field mt-2" />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{state.notice}</p>
      )}
      {state.devResetUrl && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300">
          {m.auth.devResetLink}{" "}
          <Link href={state.devResetUrl} className="text-accent break-all">
            {state.devResetUrl}
          </Link>
        </p>
      )}
      <button disabled={pending} className="button-primary w-full disabled:opacity-50">
        {pending ? m.common.pleaseWait : m.auth.sendLink}
      </button>
      <p className="text-center text-sm text-zinc-500">
        <Link className="text-accent hover:text-accent-hover" href="/login">
          {m.auth.backToSignIn}
        </Link>
      </p>
    </form>
  );
}
