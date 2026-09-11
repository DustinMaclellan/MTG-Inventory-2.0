"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password";

export function ResetPasswordForm({
  action,
  token,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  token: string;
}) {
  const { m } = useI18n();
  const [state, formAction, pending] = useActionState(action, {});

  if (!token) {
    return (
      <p className="mt-8 text-sm text-rose-300">
        {m.auth.missingToken}{" "}
        <Link href="/forgot-password" className="text-emerald-400">
          {m.auth.forgotPasswordLink}
        </Link>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm text-zinc-400">
        {m.settings.newPassword}
        <input
          name="password"
          type="password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          autoComplete="new-password"
          required
          className="field mt-2"
          placeholder={interpolate(m.settings.passwordPlaceholder, { count: PASSWORD_MIN_LENGTH })}
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="button-primary w-full disabled:opacity-50">
        {pending ? m.common.pleaseWait : m.auth.savePassword}
      </button>
    </form>
  );
}
