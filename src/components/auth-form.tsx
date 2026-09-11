"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check } from "lucide-react";
import type { FormState } from "@/app/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";
import { TRIAL_DAYS } from "@/lib/constants";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password";

export function AuthForm({
  action,
  mode,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  mode: "login" | "register";
}) {
  const { m } = useI18n();
  const [state, formAction, pending] = useActionState(action, {});
  const registering = mode === "register";

  return (
    <form action={formAction} className="mt-7 space-y-4">
      {registering && (
        <label className="block">
          <span className="text-xs font-medium text-zinc-400">{m.auth.yourName}</span>
          <input
            name="displayName"
            autoComplete="name"
            required
            className="field mt-1.5"
            placeholder="Dustin"
          />
        </label>
      )}

      <label className="block">
        <span className="text-xs font-medium text-zinc-400">{m.auth.email}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field mt-1.5"
          placeholder="you@example.com"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-zinc-400">{m.auth.password}</span>
        <input
          name="password"
          type="password"
          minLength={registering ? PASSWORD_MIN_LENGTH : 1}
          maxLength={PASSWORD_MAX_LENGTH}
          autoComplete={registering ? "new-password" : "current-password"}
          required
          className="field mt-1.5"
          placeholder={registering ? interpolate(m.auth.passwordHint, { count: PASSWORD_MIN_LENGTH }) : ""}
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        className="button-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {m.common.pleaseWait}
          </span>
        ) : registering ? (
          m.auth.createAccount
        ) : (
          m.common.signIn
        )}
      </button>

      {registering && (
        <ul className="space-y-1.5 pt-1">
          {[
            interpolate(m.auth.benefit1, { days: TRIAL_DAYS }),
            m.auth.benefit2,
            m.auth.benefit3,
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs text-zinc-600">
              <Check size={12} className="shrink-0 text-emerald-500" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      )}

      {!registering && (
        <p className="text-center text-sm">
          <Link className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm" href="/forgot-password">
            {m.auth.forgot}
          </Link>
        </p>
      )}

      <p className="border-t border-white/6 pt-4 text-center text-sm text-zinc-600">
        {registering ? `${m.auth.alreadyAccount} ` : `${m.auth.newTo} `}
        <Link
          className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          href={registering ? "/login" : "/register"}
        >
          {registering ? m.common.signIn : m.common.startFreeTrial}
        </Link>
      </p>
    </form>
  );
}
